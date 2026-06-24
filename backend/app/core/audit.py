import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog

async def log_audit(
    action: str,
    resource: str,
    status: str,
    user_id: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    details: Optional[dict] = None,
    db: Optional[AsyncSession] = None
):
    """
    Log security-relevant actions to the database.
    """
    if db is None:
        return
        
    try:
        user_uuid = uuid.UUID(user_id) if user_id else None
    except ValueError:
        user_uuid = None
        
    try:
        log_entry = AuditLog(
            user_id=user_uuid,
            action=action,
            resource=resource,
            resource_id=resource_id,
            status=status,
            ip_address=ip_address,
            details=details or {}
        )
        db.add(log_entry)
        await db.commit()
    except Exception as e:
        # Prevent logging failure from breaking core API logic
        print(f"[AUDIT ERROR] Failed to save audit log: {e}")
