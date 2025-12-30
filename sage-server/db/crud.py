from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.models import Person, Thing

async def create_person(db: AsyncSession, name: str, age: int | None = None) -> Person:
    person = Person(name=name, age=age)
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person

async def get_person(db: AsyncSession, person_id: int) -> Person | None:
    result = await db.execute(select(Person).where(Person.id == person_id))
    return result.scalar_one_or_none()

async def add_thing(db: AsyncSession, 
                    owner_id: int, 
                    description: str, 
                    value: float | None = None,
                    ) -> Thing:
    thing = Thing(owner=owner_id, description=description, value=value)
    db.add(thing)
    await db.commit()   
    await db.refresh(thing)
    return thing
