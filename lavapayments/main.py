# main.py
from run_calendar import make_session, handle_turn


def receive_from_call() -> str | None:
    """
    Return the caller's latest utterance as text, or None to end.
    TODO: Replace input() with your telephony integration (Twilio, Vonage, etc.)
    """
    try:
        msg = input()
        return msg if msg else None
    except (EOFError, KeyboardInterrupt):
        return None


def send_to_call(text: str) -> None:
    """
    Speak or send text back to the caller.
    TODO: Replace print() with your telephony TTS integration
    """
    print(text)


def main():
    selected = int(input("Department (1-3): ") or "1")
    session = make_session(selected)

    send_to_call(handle_turn(session, "Hello"))

    while True:
        msg = receive_from_call()
        if not msg or msg.lower() in {"bye", "quit", "exit"}:
            break
        send_to_call(handle_turn(session, msg))


if __name__ == "__main__":
    main()