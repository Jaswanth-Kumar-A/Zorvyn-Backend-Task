from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.transaction import Transaction, TransactionType
from app.schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate


router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
) -> TransactionOut:
    transaction = Transaction(**payload.model_dump())
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("/", response_model=list[TransactionOut])
def list_transactions(
    db: Session = Depends(get_db),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    category: str | None = Query(default=None),
    type: TransactionType | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[TransactionOut]:
    query = db.query(Transaction).filter(Transaction.is_deleted.is_(False))

    if start_date is not None:
        query = query.filter(Transaction.date >= start_date)
    if end_date is not None:
        query = query.filter(Transaction.date <= end_date)
    if category is not None:
        query = query.filter(Transaction.category == category)
    if type is not None:
        query = query.filter(Transaction.type == type)

    transactions = query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    return transactions


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
) -> TransactionOut:
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.is_deleted.is_(False))
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
) -> TransactionOut:
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.is_deleted.is_(False))
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(transaction, field, value)

    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
) -> None:
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.is_deleted.is_(False))
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    transaction.is_deleted = True
    db.add(transaction)
    db.commit()
