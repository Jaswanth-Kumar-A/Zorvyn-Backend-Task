from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.record import FinancialRecord, RecordType
from app.schemas.record import RecordCreate, RecordDeleteResponse, RecordOut, RecordUpdate
from app.services.record_service import create_record, delete_record, get_record, list_records, update_record


router = APIRouter(prefix="/records", tags=["records"])


@router.post("", response_model=RecordOut, status_code=status.HTTP_201_CREATED)
def create_financial_record(
    payload: RecordCreate,
    db: Session = Depends(get_db),
) -> RecordOut:
    return create_record(db, payload)


@router.get("", response_model=list[RecordOut])
def read_financial_records(
    db: Session = Depends(get_db),
    type: RecordType | None = None,
) -> list[RecordOut]:
    return list_records(db, type)


@router.get("/{record_id}", response_model=RecordOut)
def read_financial_record(
    record_id: int,
    db: Session = Depends(get_db),
) -> RecordOut:
    record = get_record(db, record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return record


@router.put("/{record_id}", response_model=RecordOut)
def edit_financial_record(
    record_id: int,
    payload: RecordUpdate,
    db: Session = Depends(get_db),
) -> RecordOut:
    record = get_record(db, record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return update_record(db, record, payload)


@router.delete("/{record_id}", response_model=RecordDeleteResponse)
def remove_financial_record(
    record_id: int,
    db: Session = Depends(get_db),
) -> RecordDeleteResponse:
    record = get_record(db, record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    deleted_record = delete_record(db, record)
    return RecordDeleteResponse(message="Record deleted successfully", record=deleted_record)
