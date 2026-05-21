from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password

from app.models.user import User

from app.schemas.auth import UserRegister


router = APIRouter()


@router.post("/register")
async def register_user(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):

    query = select(User).where(
        User.email == user_data.email
    )

    result = await db.execute(query)

    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hash_password(
            user_data.password
        )
    )

    db.add(new_user)

    await db.commit()

    await db.refresh(new_user)

    return {
        "message": "User created successfully"
    }