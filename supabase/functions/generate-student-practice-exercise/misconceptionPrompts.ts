
// Enhanced AI prompts for generating misconception-based MCQ distractors
export function createMisconceptionAwareMCQPrompt(
  skillName: string,
  subject: string,
  grade: string,
  difficulty: string
): string {
  return `Generate ${difficulty} level multiple-choice questions for ${grade} ${subject}, focusing on the skill: "${skillName}".

CRITICAL REQUIREMENT: For each multiple-choice question, create distractors that represent SPECIFIC, COMMON MISCONCEPTIONS students have with this skill.

For each incorrect option (A, B, C, D - excluding the correct answer), you MUST:
1. Base the distractor on a real misconception students commonly have
2. Provide a clear misconception description 
3. Map to one of these misconception categories:
   - Procedural Errors (step omission, order errors, symbol confusion)
   - Conceptual Errors (false assumptions, overgeneralization, model misuse)
   - Interpretive Errors (keyword confusion, task misread, literal interpretation)
   - Expression Errors (vocabulary mismatch, poor organization)
   - Strategic Errors (wrong approach, off-topic response)
   - Meta-Cognitive Errors (overconfidence, ignoring feedback)

EXAMPLE OUTPUT FORMAT:
{
  "title": "Practice: ${skillName}",
  "description": "Practice exercises with misconception-aware feedback",
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "What is 3/4 + 1/2?",
      "options": ["5/6", "4/6", "5/8", "7/8"],
      "correctAnswer": "5/6",
      "explanation": "Find common denominator: 3/4 + 1/2 = 6/12 + 6/12 = 12/12 = 1 = 5/6",
      "points": 1,
      "targetSkill": "${skillName}",
      "choiceMisconceptions": {
        "A": {"correct": true},
        "B": {
          "misconceptionCategory": "Procedural Errors",
          "misconceptionSubtype": "Step Omission",
          "description": "Student added numerators and denominators separately (3+1=4, 4+2=6)",
          "confidence": 0.9
        },
        "C": {
          "misconceptionCategory": "Conceptual Errors",
          "misconceptionSubtype": "False Assumption",
          "description": "Student used 8 as common denominator but made calculation error",
          "confidence": 0.8
        },
        "D": {
          "misconceptionCategory": "Procedural Errors",
          "misconceptionSubtype": "Symbol Confusion",
          "description": "Student confused addition with another operation",
          "confidence": 0.7
        }
      }
    }
  ]
}

Generate 4-6 questions following this exact format. Each distractor MUST represent a genuine misconception students make with ${skillName} in ${grade} ${subject}.`;
}

export function createMisconceptionPromptForSubject(subject: string): string {
  const subjectSpecificMisconceptions = {
    'Math': `
Common Math Misconceptions to Target:
- Fraction operations: adding numerators and denominators separately
- Order of operations: left-to-right processing ignoring PEMDAS
- Negative numbers: sign errors in multiplication/division
- Algebraic thinking: treating variables as labels rather than unknowns
- Geometry: confusing area and perimeter formulas
`,
    'Science': `
Common Science Misconceptions to Target:
- Force and motion: heavier objects fall faster
- Energy: energy is used up rather than transformed
- Matter: atoms are indivisible particles
- Evolution: individuals evolve during their lifetime
- Electricity: current is used up in circuits
`,
    'English': `
Common English Misconceptions to Target:
- Grammar: confusing affect/effect, its/it's
- Reading comprehension: literal interpretation of figurative language
- Writing: run-on sentences, comma splices
- Vocabulary: assuming similar-looking words have similar meanings
`,
    'Social Studies': `
Common Social Studies Misconceptions to Target:
- Historical thinking: presentism (judging past by present standards)
- Geography: confusing weather and climate
- Government: thinking democracy means majority always rules
- Economics: zero-sum thinking about trade
`
  };

  return subjectSpecificMisconceptions[subject as keyof typeof subjectSpecificMisconceptions] || '';
}
