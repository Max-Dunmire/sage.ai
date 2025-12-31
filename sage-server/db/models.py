from sqlalchemy import Integer, String, Float, Column, ForeignKey, DateTime, func
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Call(Base):
    __tablename__ = 'calls'
    call_sid = Column(String, primary_key=True)
    account_sid = Column(String)
    recipient = Column(String, nullable=False)
    caller = Column(String, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )

class Client(Base):
    __tablename__ = 'clients'
    client_id = Column(Integer, primary_key=True)
    phone_number = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    instructions = Column(String)

class Person(Base):
    __tablename__ = 'people'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    age = Column(Integer)

    things = relationship('Thing', back_populates='person')

class Thing(Base):
    __tablename__ = 'things'
    id = Column(Integer, primary_key=True)
    description = Column(String, nullable=False)
    value = Column(Float)
    owner = Column(Integer, ForeignKey('people.id'))

    person = relationship('Person', back_populates='things')
