"""Taxonomy-based and semantic skill extraction and matching."""
import json
import re
from pathlib import Path
from typing import NamedTuple

import spacy
from rapidfuzz import fuzz
from spacy.matcher import PhraseMatcher

_TAXONOMY_PATH = Path(__file__).parent.parent / "data" / "skills_taxonomy.json"

# Heuristics to classify JD requirements as required vs preferred
_REQUIRED_SIGNALS = re.compile(
    r"\b(required|must have|must-have|mandatory|essential|need|needs|necessary)\b",
    re.IGNORECASE,
)
_PREFERRED_SIGNALS = re.compile(
    r"\b(preferred|nice to have|nice-to-have|bonus|optional|plus|advantage|desired|ideally)\b",
    re.IGNORECASE,
)

# Section headings that imply required
_REQUIRED_HEADINGS = re.compile(
    r"^(requirements?|qualifications?|must have|what you.ll need|what we.re looking for)",
    re.IGNORECASE | re.MULTILINE,
)
_PREFERRED_HEADINGS = re.compile(
    r"^(preferred|nice to have|bonus|additional|plus)",
    re.IGNORECASE | re.MULTILINE,
)

FUZZY_THRESHOLD = 85  # rapidfuzz score 0-100


class SkillEntry(NamedTuple):
    canonical: str
    aliases: list[str]


class SkillExtractorService:
    def __init__(self) -> None:
        self.nlp = spacy.load("en_core_web_sm")
        self.taxonomy: list[SkillEntry] = self._load_taxonomy()
        self.matcher = self._build_matcher()
        # Map lowercase alias -> canonical
        self._alias_map: dict[str, str] = {}
        for entry in self.taxonomy:
            self._alias_map[entry.canonical.lower()] = entry.canonical
            for alias in entry.aliases:
                self._alias_map[alias.lower()] = entry.canonical

    def _load_taxonomy(self) -> list[SkillEntry]:
        raw = json.loads(_TAXONOMY_PATH.read_text())
        return [SkillEntry(r["canonical"], r["aliases"]) for r in raw]

    def _build_matcher(self) -> PhraseMatcher:
        matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")
        for entry in self.taxonomy:
            terms = [entry.canonical] + entry.aliases
            patterns = [self.nlp.make_doc(t) for t in terms]
            matcher.add(entry.canonical, patterns)
        return matcher

    def extract_skills(self, text: str) -> list[str]:
        """Return deduplicated canonical skills found in text."""
        doc = self.nlp(text)
        found: set[str] = set()

        # PhraseMatcher pass
        matches = self.matcher(doc)
        for match_id, _start, _end in matches:
            found.add(self.nlp.vocab.strings[match_id])

        # Fuzzy pass over individual tokens and bigrams for near-misses
        tokens = [t.text for t in doc if not t.is_space]
        candidates = tokens + [
            f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens) - 1)
        ]
        for candidate in candidates:
            for entry in self.taxonomy:
                if entry.canonical in found:
                    continue
                all_forms = [entry.canonical] + entry.aliases
                for form in all_forms:
                    if fuzz.ratio(candidate.lower(), form.lower()) >= FUZZY_THRESHOLD:
                        found.add(entry.canonical)
                        break

        return sorted(found)

    def classify_jd_skills(
        self, text: str
    ) -> tuple[list[str], list[str]]:
        """
        Split JD skills into (required, preferred).
        Falls back to treating everything as required if section detection fails.
        """
        all_skills = self.extract_skills(text)

        # Try to detect sections
        lines = text.splitlines()
        required_skills: set[str] = set()
        preferred_skills: set[str] = set()

        current_section = "required"  # default
        for line in lines:
            stripped = line.strip()
            if _REQUIRED_HEADINGS.match(stripped):
                current_section = "required"
            elif _PREFERRED_HEADINGS.match(stripped):
                current_section = "preferred"

            line_skills = self.extract_skills(stripped)
            # Check inline signals
            if _PREFERRED_SIGNALS.search(stripped):
                preferred_skills.update(line_skills)
            elif _REQUIRED_SIGNALS.search(stripped):
                required_skills.update(line_skills)
            elif current_section == "preferred":
                preferred_skills.update(line_skills)
            else:
                required_skills.update(line_skills)

        # Skills not classified as preferred default to required
        unclassified = set(all_skills) - preferred_skills - required_skills
        required_skills.update(unclassified)

        # Remove from required any that ended up in preferred
        required_skills -= preferred_skills

        return sorted(required_skills), sorted(preferred_skills)
