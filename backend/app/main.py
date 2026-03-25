from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.future import select
from .database import engine, Base, get_db
from .models import User, Note
from .auth import ALGORITHM, SECRET_KEY, verify_pass, create_token, hash_pass
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Dependency to Get Current User from JWT ---
async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise HTTPException(status_code=401)
    except JWTError: raise HTTPException(status_code=401)
    
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if user is None: raise HTTPException(status_code=401)
    return user

# --- API Endpoints ---

@app.post("/api/v1/register")
async def register(data = Body(...), db=Depends(get_db)):
    hashed = hash_pass(data['password'])
    new_user = User(username=data['username'], hashed_password=hashed, role=data.get('role', 'user'))
    db.add(new_user)
    await db.commit()
    return {"message": "User registered successfully"}

@app.post("/token")
async def login(data = Body(...), db=Depends(get_db)):
    result = await db.execute(select(User).where(User.username == data['username']))
    user = result.scalars().first()
    if not user or not verify_pass(data['password'], user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/v1/notes")
async def read_notes(current_user: User = Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Note).where(Note.owner_id == current_user.id))
    return result.scalars().all()

@app.post("/api/v1/notes")
async def create_note(data = Body(...), current_user: User = Depends(get_current_user), db=Depends(get_db)):
    new_note = Note(title=data['title'], content=data['content'], owner_id=current_user.id)
    db.add(new_note)
    await db.commit()
    return {"message": "Note created"}