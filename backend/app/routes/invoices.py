"""Invoice API routes."""

from uuid import UUID

from flask import Blueprint, Response, jsonify, request, send_file
from pydantic import ValidationError

from app.extensions import db
from app.models import Invoice
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceListResponse,
    InvoicePreviewRequest,
    InvoicePreviewResponse,
    InvoiceResponse,
    InvoiceUpdate,
    InvoiceWithClientResponse,
)
from app.services import invoice_service
from app.services.pdf_service import generate_invoice_pdf

invoices_bp = Blueprint("invoices", __name__)


@invoices_bp.route("/invoices", methods=["GET"])
def list_invoices() -> tuple[Response, int]:
    """List all invoices with optional filtering."""
    client_id = request.args.get("client_id")
    status = request.args.get("status")

    session = db.get_session()
    try:
        invoices = invoice_service.get_invoices(
            session,
            client_id=UUID(client_id) if client_id else None,
            status=status,
        )

        invoice_responses = []
        for inv in invoices:
            response = InvoiceWithClientResponse.model_validate(inv)
            response.client_name = inv.client.name if inv.client else None
            invoice_responses.append(response)

        return jsonify(
            InvoiceListResponse(
                invoices=invoice_responses,
                total=len(invoice_responses),
            ).model_dump(mode="json")
        ), 200
    finally:
        session.close()


@invoices_bp.route("/invoices/<uuid:invoice_id>", methods=["GET"])
def get_invoice(invoice_id: UUID) -> tuple[Response, int]:
    """Get a single invoice with all details."""
    session = db.get_session()
    try:
        invoice = invoice_service.get_invoice_with_details(session, invoice_id)
        if not invoice:
            return jsonify({"error": "Invoice not found"}), 404

        response = InvoiceResponse.model_validate(invoice)
        return jsonify(response.model_dump(mode="json")), 200
    finally:
        session.close()


@invoices_bp.route("/invoices/preview", methods=["POST"])
def preview_invoice() -> tuple[Response, int]:
    """Preview an invoice before creating it."""
    try:
        data = InvoicePreviewRequest.model_validate(request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        preview_data = invoice_service.preview_invoice(
            session,
            data.client_id,
            data.period_start,
            data.period_end,
            data.exclude_entry_ids,
        )
        return jsonify(
            InvoicePreviewResponse.model_validate(preview_data).model_dump(mode="json")
        ), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    finally:
        session.close()


@invoices_bp.route("/invoices", methods=["POST"])
def create_invoice() -> tuple[Response, int]:
    """Create a new invoice."""
    try:
        data = InvoiceCreate.model_validate(request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        # If line items provided, use them directly
        if data.line_items:
            line_items_data = [item.model_dump() for item in data.line_items]
            invoice = invoice_service.create_invoice(
                session,
                data.client_id,
                data.period_start,
                data.period_end,
                line_items_data,
                data.hourly_rate,
                data.tax_rate,
                data.other_charges,
            )
        else:
            # Create from time entries
            invoice = invoice_service.create_invoice_from_entries(
                session,
                data.client_id,
                data.period_start,
                data.period_end,
                tax_rate=data.tax_rate,
                other_charges=data.other_charges,
            )

        session.commit()

        # Reload with relationships
        invoice = invoice_service.get_invoice_with_details(session, invoice.id)
        response = InvoiceResponse.model_validate(invoice)
        return jsonify(response.model_dump(mode="json")), 201

    except ValueError as e:
        session.rollback()
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@invoices_bp.route("/invoices/<uuid:invoice_id>", methods=["PUT"])
def update_invoice(invoice_id: UUID) -> tuple[Response, int]:
    """Update a draft invoice."""
    try:
        data = InvoiceUpdate.model_validate(request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    session = db.get_session()
    try:
        invoice = session.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return jsonify({"error": "Invoice not found"}), 404

        if invoice.is_finalized:
            return jsonify({"error": "Cannot update a finalized invoice"}), 400

        # Update fields
        if data.period_start is not None:
            invoice.period_start = data.period_start
        if data.period_end is not None:
            invoice.period_end = data.period_end
        if data.hourly_rate is not None:
            invoice.hourly_rate = data.hourly_rate
        if data.tax_rate is not None:
            invoice.tax_rate = data.tax_rate
        if data.other_charges is not None:
            invoice.other_charges = data.other_charges

        # Recalculate totals
        invoice.calculate_totals()

        session.commit()

        invoice = invoice_service.get_invoice_with_details(session, invoice.id)
        response = InvoiceResponse.model_validate(invoice)
        return jsonify(response.model_dump(mode="json")), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@invoices_bp.route("/invoices/<uuid:invoice_id>", methods=["DELETE"])
def delete_invoice(invoice_id: UUID) -> tuple[Response, int]:
    """Delete a draft invoice."""
    session = db.get_session()
    try:
        invoice = session.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return jsonify({"error": "Invoice not found"}), 404

        invoice_service.delete_invoice(session, invoice)
        session.commit()
        return jsonify({"message": "Invoice deleted"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@invoices_bp.route("/invoices/<uuid:invoice_id>/finalize", methods=["POST"])
def finalize_invoice(invoice_id: UUID) -> tuple[Response, int]:
    """Finalize an invoice and generate PDF."""
    session = db.get_session()
    try:
        invoice = invoice_service.get_invoice_with_details(session, invoice_id)
        if not invoice:
            return jsonify({"error": "Invoice not found"}), 404

        # Finalize the invoice
        invoice_service.finalize_invoice(session, invoice)

        # Generate PDF
        pdf_path = generate_invoice_pdf(session, invoice)
        invoice.pdf_path = pdf_path

        session.commit()

        # Reload and return
        invoice = invoice_service.get_invoice_with_details(session, invoice.id)
        response = InvoiceResponse.model_validate(invoice)
        return jsonify(response.model_dump(mode="json")), 200

    except ValueError as e:
        session.rollback()
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@invoices_bp.route("/invoices/<uuid:invoice_id>/pdf", methods=["GET"])
def download_invoice_pdf(invoice_id: UUID) -> Response | tuple[Response, int]:
    """Download the invoice PDF."""
    session = db.get_session()
    try:
        invoice = session.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return jsonify({"error": "Invoice not found"}), 404

        if not invoice.pdf_path:
            # Generate PDF on-the-fly if not exists
            invoice = invoice_service.get_invoice_with_details(session, invoice_id)
            pdf_path = generate_invoice_pdf(session, invoice)
            invoice.pdf_path = pdf_path
            session.commit()

        return send_file(
            invoice.pdf_path,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"invoice_{invoice.invoice_number}.pdf",
        )
    finally:
        session.close()
