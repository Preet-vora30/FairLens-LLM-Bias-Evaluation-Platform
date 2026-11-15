from fastapi import APIRouter
from app.schemas.mitigation import CounterfactualAugmentRequest, CounterfactualAugmentResponse
from app.services.mitigation.counterfactual_augmenter import counterfactual_augmenter

router = APIRouter(tags=["Counterfactuals"])


@router.post("/counterfactuals")
def augment_counterfactual(req: CounterfactualAugmentRequest):
    """Generate (or validate) a counterfactual demographic pair for a text snippet."""
    return counterfactual_augmenter.augment_text(req.text, category=req.category)
