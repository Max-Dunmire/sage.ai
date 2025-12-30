from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.models import Person, Thing, Call


async def create_call(
    db: AsyncSession, 
    call_sid: int,
    account_sid: int, 
    recipient: str,
    caller: str
) -> Call:

    call = Call(
        call_sid=call_sid,
        account_sid=account_sid,
        recipient=recipient,
        caller=caller
    )

    db.add(call)
    await db.commit()
    await db.refresh(call)
    return call    

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
