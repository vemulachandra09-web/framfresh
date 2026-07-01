import logging
import sys


LOG_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    level = getattr(logging, log_level.upper(), logging.INFO)

    logging.basicConfig(
        level=level,
        format=LOG_FORMAT,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    logger = logging.getLogger("farmfresh")
    logger.setLevel(level)
    return logger


def mask_phone(phone: str | None) -> str:
    if not phone:
        return ""
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) <= 4:
        return "****"
    return f"******{digits[-4:]}"
