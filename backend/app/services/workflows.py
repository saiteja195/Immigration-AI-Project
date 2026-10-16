from functools import lru_cache
from pathlib import Path

import yaml

from app.models.workflow import Workflow

WORKFLOW_DIR = Path(__file__).resolve().parent.parent / "templates" / "workflows"


@lru_cache
def load_all() -> dict[str, Workflow]:
    result = {}
    for path in sorted(WORKFLOW_DIR.glob("*.yaml")):
        wf = Workflow(**yaml.safe_load(path.read_text()))
        result[wf.id] = wf
    return result


def get_workflow(workflow_id: str) -> Workflow | None:
    return load_all().get(workflow_id)
