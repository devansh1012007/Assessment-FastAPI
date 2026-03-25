from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from .database import engine, Base, get_db
from .models import User, Note
from .auth import ALGORITHM, SECRET_KEY, verify_pass, create_token, hash_pass
from pydantic import BaseModel
from typing import Optional


app = FastAPI(title="PrimeTrade Secure Notes API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class UserCreate(BaseModel):
    username: str
    password: str
    role: Optional[str] = "user"


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise HTTPException(status_code=401)
    except JWTError: raise HTTPException(status_code=401)
    
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if user is None: raise HTTPException(status_code=401)
    return user

async def get_current_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

@app.post("/api/v1/register")
async def register(user: UserCreate, db=Depends(get_db)):
    # Truncate to 72 chars to satisfy Bcrypt, though standard passwords rarely hit this
    safe_password = user.password[:72] 
    hashed = hash_pass(safe_password)
    
    new_user = User(
        username=user.username, 
        hashed_password=hashed, 
        role=user.role
    )
    db.add(new_user)
    await db.commit()
    return {"message": "User registered successfully"}

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    if not user or not verify_pass(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Note CRUD Endpoints ---
@app.get("/api/v1/notes")
async def read_notes(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.owner_id == current_user.id))
    return result.scalars().all()

@app.post("/api/v1/notes")
async def create_note(data = Body(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    new_note = Note(title=data['title'], content=data['content'], owner_id=current_user.id)
    db.add(new_note)
    await db.commit()
    return {"message": "Note created", "id": new_note.id}

@app.delete("/api/v1/notes/{note_id}")
async def delete_note(note_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(Note.id == note_id, Note.owner_id == current_user.id))
    note = result.scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
    await db.commit()
    return {"message": "Note deleted successfully"}


@app.put("/api/v1/notes/{note_id}")
async def update_note(
    note_id: int, 
    data = Body(...), 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    # 1. Find the note ensuring it belongs to the current user
    result = await db.execute(select(Note).where(Note.id == note_id, Note.owner_id == current_user.id))
    note = result.scalars().first()
    
    # 2. Return 404 if the note doesn't exist or doesn't belong to the user
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # 3. Update the fields
    note.title = data['title']
    note.content = data['content']
    
    # 4. Save changes to the database
    await db.commit()
    
    return {"message": "Note updated successfully", "note": {"id": note.id, "title": note.title}}
# --- Admin Only Endpoint (RBAC Demonstration) --- (role based access control)

@app.get("/api/v1/admin/all-users")
async def get_all_users(admin_user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [{"id": u.id, "username": u.username, "role": u.role} for u in users]