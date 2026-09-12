from app.models.schemas import RoleProfile, RoleRequirement


ROLE_PROFILES = [
    RoleProfile(
        id="role-ai-transformation-consultant",
        name="AI Transformation Consultant",
        requirements=[
            RoleRequirement(competency_id="C01", required_level=60, weight=0.15),
            RoleRequirement(competency_id="C03", required_level=60, weight=0.10),
            RoleRequirement(competency_id="C04", required_level=60, weight=0.10),
            RoleRequirement(competency_id="C05", required_level=60, weight=0.15),
            RoleRequirement(competency_id="C08", required_level=70, weight=0.20),
            RoleRequirement(competency_id="C09", required_level=65, weight=0.15),
            RoleRequirement(competency_id="C10", required_level=60, weight=0.05),
            RoleRequirement(competency_id="C12", required_level=60, weight=0.05),
            RoleRequirement(competency_id="C13", required_level=60, weight=0.05),
        ],
    ),

    RoleProfile(
        id="role-business-technology-consultant",
        name="Business / Technology Consultant",
        requirements=[
            RoleRequirement(competency_id="C01", required_level=65, weight=0.15),
            RoleRequirement(competency_id="C02", required_level=65, weight=0.10),
            RoleRequirement(competency_id="C03", required_level=65, weight=0.15),
            RoleRequirement(competency_id="C04", required_level=65, weight=0.10),
            RoleRequirement(competency_id="C06", required_level=60, weight=0.10),
            RoleRequirement(competency_id="C09", required_level=70, weight=0.15),
            RoleRequirement(competency_id="C10", required_level=65, weight=0.10),
            RoleRequirement(competency_id="C12", required_level=65, weight=0.10),
            RoleRequirement(competency_id="C13", required_level=65, weight=0.05),
        ],
    ),

    RoleProfile(
        id="role-ai-ml-consultant",
        name="AI / ML Consultant",
        requirements=[
            RoleRequirement(competency_id="C02", required_level=60, weight=0.10),
            RoleRequirement(competency_id="C04", required_level=65, weight=0.10),
            RoleRequirement(competency_id="C08", required_level=75, weight=0.25),
            RoleRequirement(competency_id="C09", required_level=65, weight=0.15),
            RoleRequirement(competency_id="C10", required_level=60, weight=0.10),
            RoleRequirement(competency_id="C13", required_level=60, weight=0.10),
            RoleRequirement(competency_id="C14", required_level=65, weight=0.20),
        ],
    ),
]


CLIENT_FACING_ROLE_IDS = {
    "role-ai-transformation-consultant",
    "role-business-technology-consultant",
    "role-ai-ml-consultant",
}
