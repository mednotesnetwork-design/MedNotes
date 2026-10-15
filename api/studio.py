"""Isolated Lecture Studio API. No change to Research Mentor."""
from server.study_proxy import StudyProxy
class handler(StudyProxy):
    upstream='studio'
