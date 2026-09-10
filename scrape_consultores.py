#!/usr/bin/env python3
"""
Web scraper for industrial time study consultants and companies
Searches Google and relevant websites to find consultants in the field of:
- Cronometraje industrial (Industrial time study)
- Métodos y tiempos (Methods and time)
- MTM, MOST, OEE, Lean manufacturing
- Work sampling, time and motion studies

Outputs data in the format needed for Firestore directorio_asetemyt collection
"""

import json
import time
import random
import re
from urllib.parse import quote_plus, urljoin
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class IndustrialConsultantScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.consultants = []
        self.processed_urls = set()

        # Specialties we're looking for
        self.specialties_map = {
            'cronometraje': ['cronometraje', 'time study', 'time measurement', 'cronometro'],
            'mtm': ['mtm', 'methods-time measurement'],
            'most': ['most', 'maynard operation sequence'],
            'oee': ['oee', 'overall equipment effectiveness'],
            'lean': ['lean', 'lean manufacturing', 'kaizen', 'kanban']
        }

        # Search queries to find consultants
        self.search_queries = [
            "consultor cronometraje industrial España",
            "ingeniería de métodos y tiempos consultoría",
            "empresa MTM MOST OEE España",
            "consultor lean manufacturing productividad",
            "ingeniería industrial tiempo y métodos",
            "consultoria work sampling España",
            "empresa cronometras com",
            "consultor tiempo y movimiento estudio",
            "consultoría productividad industrial España",
            "ingeniero cronometraje freelance"
        ]

        # Known good sources to prioritize
        self.known_sources = [
            "cronometras.com",
            "worksamp.com",
            "induly.com",
            "itemse.es",
            "zadecon.es",
            "aiju.info",
            "ipyc.es"
        ]

    def extract_slug(self, nombre):
        """Create a URL-friendly slug from the name"""
        slug = nombre.lower()
        # Remove special characters and replace spaces with hyphens
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')

    def extract_specialties_from_text(self, text):
        """Extract specialties from text based on keywords"""
        text_lower = text.lower()
        specialties = []

        for specialty, keywords in self.specialties_map.items():
            for keyword in keywords:
                if keyword in text_lower:
                    specialties.append(specialty)
                    break  # Avoid duplicates

        return list(set(specialties))  # Remove duplicates

    def extract_services_from_text(self, text):
