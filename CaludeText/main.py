# main.py
# Your app loop: message-in → scheduler → message-out. No input() used here.

from run_calendar import make_session, handle_turn

def receive_from_call() -> str | None:
    """Return the caller's latest utterance as text, or None to end."""
    # TODO: implement in your telephony layer

    return input()

def send_to_call(text: str) -> None:
    """Speak or send text back to the caller."""
    # TODO: implement in your telephony layer
    print(text)
    pass

def main():
    secretary = ""
    # Obtain 1/2/3 from your upstream logic
    # e.g., selected = get_queue_route()  # returns 1, 2, or 3
    selected = 1  # Doctor by default for now

    session = make_session(selected)

    # Example: first message could arrive from your IVR before loop starts
    # first_msg = get_initial_prompt()
    # if first_msg: send_to_call(handle_turn(session, first_msg))

    bye_set = {"bye","goodbye","quit","exit","hang up","end call"}
    while True:
        msg = receive_from_call()
        secretary += msg
        if msg is None:
            break
        reply = handle_turn(session, msg)
        secretary += ", "
        secretary += reply
        send_to_call(reply)
        if msg.strip().lower() in bye_set:
            break

if __name__ == "__main__":
    main()
