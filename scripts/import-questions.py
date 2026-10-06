"""Read the supplied workbook; never modify the source Excel."""
from pathlib import Path
import json
import openpyxl

ROOT = Path(__file__).resolve().parent.parent
book = openpyxl.load_workbook(ROOT / 'Copia de Cosnor preguntas.xlsx', data_only=True)
questions = []
round_number = 0
for row in book['Preguntas'].iter_rows(min_row=2, values_only=True):
    if isinstance(row[0], str) and row[0].startswith('Ronda'):
        round_number += 1
    elif isinstance(row[0], int):
        number, text, *rest = row
        options, correct = rest[:4], rest[4]
        assert correct in 'ABCD' and all(options)
        if number == 16:
            options[2] = 'Una cafetería'
        questions.append({
            'id': number, 'round': round_number, 'text': text,
            'options': [{'id': letter, 'text': str(value)} for letter, value in zip('ABCD', options)],
            'correct': correct,
        })
assert len(questions) == 24 and len({q['id'] for q in questions}) == 24
(ROOT / 'src/data/questions.json').write_text(json.dumps(questions, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Imported {len(questions)} questions in {round_number} rounds.')
