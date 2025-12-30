from sqlalchemy import create_engine, Integer, String, Float, Column, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

engine = create_engine('postgresql+psycopg://maxdu:Tinatina22@localhost:5432/mydb')

Base = declarative_base()

Base.metadata.create_all(engine)

Session = sessionmaker(bind=engine)
session = Session()

new_person = Person(name='Sam', age=80)
session.add(new_person)

session.commit()