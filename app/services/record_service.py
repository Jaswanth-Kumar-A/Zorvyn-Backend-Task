from sqlalchemy.orm import Session

from app.models.record import FinancialRecord, RecordType
from app.schemas.record import RecordCreate, RecordUpdate


def create_record(db: Session, payload: RecordCreate) -> FinancialRecord:
    record = FinancialRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_records(db: Session, record_type: RecordType | None = None) -> list[FinancialRecord]:
    query = db.query(FinancialRecord)

    if record_type is not None:
        query = query.filter(FinancialRecord.type == record_type)

    return query.order_by(FinancialRecord.created_at.desc()).all()


def get_record(db: Session, record_id: int) -> FinancialRecord | None:
    return db.query(FinancialRecord).filter(FinancialRecord.id == record_id).first()


def update_record(db: Session, record: FinancialRecord, payload: RecordUpdate) -> FinancialRecord:
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(record, field, value)

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def delete_record(db: Session, record: FinancialRecord) -> FinancialRecord:
    db.delete(record)
    db.commit()
    return record
