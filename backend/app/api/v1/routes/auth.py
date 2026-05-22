from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password

from app.models.user import User
from app.schemas.auth import UserRegister

from app.schemas.auth import UserLogin
from app.schemas.auth import TokenResponse

from app.core.security import verify_password
from app.core.security import create_access_token
from app.api.deps import get_current_user

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

@router.post(
    "/login",
    response_model=TokenResponse
)
async def login_user(
    user_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):

    query = select(User).where(
        User.email == user_data.email
    )

    result = await db.execute(query)

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    is_valid_password = verify_password(
        user_data.password,
        user.hashed_password
    )

    if not is_valid_password:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user)
):

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name
    }
