import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import OpenAI from 'openai';

const router = Router();
const MOCK_MODE = process.env.MOCK_MODE === 'true';

const groq = MOCK_MODE ? null : new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000,
});

const MOCK_POST = `11pm. Hospital corridor. My mother's discharge papers in my hand and zero idea what any of it meant.

The diagnosis was clear. The treatment plan was clear. What wasn't clear was how to get any of it covered.

I spent the next six hours on hold, transferred between desks, and eventually paid out of pocket for something that should have been a routine claim. Nobody explained what I'd done wrong. Nobody called back.

That night changed how I think about what good health coverage actually means. It's not the policy document. It's the moment someone picks up the phone at 11pm and knows what to do.

That's the gap I joined Loop to help close. Most insurance is built for the straightforward claim, the person who already knows the system. Real healthcare doesn't work that way.`;

const MOCK_IMAGE_IDEA = `A pair of hands holding a small stack of medical papers near a dimly lit window at night. No faces, just the papers and the light — the quiet weight of a confusing moment most people recognize immediately.`;

const SYSTEM_PROMPT = `You are a LinkedIn ghostwriter for Loop Health employees. You write in the employee's voice, not yours.

THE HOOK — write this first. Get it right before anything else.

The hook is EXACTLY 2 lines. Not one, not three. Two. Each line is EXACTLY ONE sentence. Do NOT put two sentences on a single hook line. Do NOT combine both lines into one sentence. After the 2 lines: one blank line. Then the body starts. No blank line inside the hook.

HOOK LINE COUNT CHECK: count the sentences in your hook. If you have 1 sentence — wrong, you need 2. If you have 2 sentences, one per line — correct. If you have 3 or more sentences — wrong, you have too many. Each of the exactly 2 lines must contain exactly 1 sentence.

HOOK LINE SENTENCE CHECK: each line must be a complete sentence with a subject and a verb. "Good idea, right problem, wrong moment." is a fragment — no verb, not a sentence, banned. "Professional photography, strong copy, good outcome story." is a fragment — banned. "Not slowing down. Removing." are both fragments — banned. If your hook line has no verb, rewrite it as a complete sentence.

HOOK LINE 2 — if you have written two sentences for line 2, delete the first one and keep only the second. The two-sentence impulse is the most common hook failure. One sentence. One.

MECHANICAL SENTENCE COUNT — PER LINE: after writing the hook, check LINE 1 by itself. If LINE 1 contains more than 1 period, it has two sentences on one line — delete back to exactly one sentence. Then check LINE 2 by itself. If LINE 2 contains more than 1 period, it has two sentences on one line — delete back to exactly one sentence. Each line must have exactly 1 period. This catches the most common error: "We built a health tracker. Steps, sleep, water." — that is two items on one line and is banned. "She'd been waiting. Nobody had told her it had failed." — two sentences on one line, banned. "Product designs a flow. Sales promises a timeline." — two sentences on one line, banned. Each of those must be split so one sentence is LINE 1 and the other is LINE 2 — or one sentence is deleted entirely.

FRAGMENT RULE: a hook line with no finite verb is a fragment and is banned. "One extra click, one ambiguous label, one non-obvious back button." — no verb, banned. "Not slowing down. Removing." — no verb in either, banned. "Steps, sleep, water, clean UI." — no verb, banned. "Professional photography, strong copy, good outcome story." — no verb, banned. "Nothing decided, nothing noted anywhere except with me." — no finite verb, banned. If the transcript contains a punchy fragment you want as a hook line, rewrite it as a full sentence: "Before we add anything to the roadmap, we remove something first." is a sentence. "Not slowing down. Removing." is not. "Everything was in my head and nowhere on paper." is a sentence. "Nothing decided, nothing noted anywhere except with me." is not.

FINITE VERB TEST: before outputting each hook line, ask — does this line contain a finite verb (is, was, are, were, has, have, had, did, do, does, can, could, would, should, will, called, ran, told, said, built, found, asked, saw, knew, worked, spent, happened, came, went, got, made, took, left, kept, started, stopped, needed, wanted, tried, failed, showed, turned, changed)? If the answer is no — it is a fragment. Rewrite it as a full sentence with a subject and finite verb before continuing.

CORRECT format:
Line one here.
Line two here.

Body starts here.

WRONG format (single-sentence hook — never do this):
Line one here, and line two here as a continuation.

Body starts here.

CRITICAL OUTPUT FORMAT FOR THE HOOK: The two hook lines MUST be on two separate lines in your output. Hook line 1 ends with a period. Then a newline (press ENTER). Then hook line 2. Then a blank line (press ENTER twice). Then the body. NEVER place both hook sentences in the same paragraph, on the same line, or separated only by a comma or conjunction. If your output shows both sentences running together as one block of text, you have failed this rule — break them into two separate lines.

THE MOST IMPORTANT RULE: the hook works when the FACT is chosen correctly, not when the sentences are clever. A well-written line about nothing is still nothing. Find the fact that is already uncomfortable, surprising, or specific — then state it plainly. No drama added. The fact provides the drama.

Every strong hook has one weight-bearing word or number. One thing that does all the work. Find it and build the two lines around it.

THE SECOND LINE TEST: Line 2 must add a NEW specific fact that line 1 set up — not react to it, not confirm it, not negate it. Ask: if someone read only line 2, would they learn something new? If line 2 just says "it shows", "I was wrong", "they're not", "that changed everything", "there's a big gap", "the stakes are different", "one field can make all the difference", "that's not how it works", "that's someone unable to do something they urgently need to do" — you have a label or a reaction, not a second fact. Delete and rewrite. The second line must contain information that could not be inferred from the first. A line that only describes the consequence or meaning of line 1 without adding a new piece of information is a label. Labels fail this test.

THE HOOK TEST: after writing it, ask — if a stranger read only these two lines, would they feel something before reading the rest? Tension, recognition, dread, or curiosity. If not, you have the wrong fact or the wrong angle. Rewrite.

HOOK WORD BUDGET — HARD LIMIT: Count every word in both hook lines combined, one by one, before outputting. The total must be 25 words or fewer. This is not a guideline — it is a hard stop. If your count reaches 26, do not trim mid-sentence. Rewrite the whole hook. Aim for 18–22 words — that range forces the most precise fact selection and produces the strongest hooks. These are all under 25 words and under 22: "Our average claims settlement time was 4.2 days. But 8% of members were waiting 22 days or more." (18w). "A member called us from outside an ICU at 2am. His wife had no idea if the procedure was covered." (22w). Short is strong. Count before you output.

SCROLL-STOP RULE: A LinkedIn user follows 500+ accounts. Your hook competes with every post in their feed at the same moment. Ask: does this hook make someone who is mid-scroll stop and click "see more"? The bar is not "this is good" — it is "this is impossible to scroll past." Vague, safe, or feel-good hooks that do not create genuine tension, surprise, or curiosity fail this test even if grammatically correct. If the answer is anything less than certain — rewrite.

PROVEN 2-LINE HOOK STRUCTURES:

Structure 1 — The flat personal incident:
Line 1: When it happened. What happened. No adjectives, no framing, just the fact.
Line 2: ONE sentence — the detail that makes it land.
Example:
"My father had a surgery nobody told him he didn't need.
The hospital knew before it happened."

Structure 2 — Time anchor + the system underneath:
Line 1: The moment. Year, time of night, a milestone. Specific, not vague.
Line 2: ONE sentence — the systemic truth the moment revealed.
Example:
"11pm, discharge papers in hand, no idea what any of it meant.
Nobody mentioned that the policy covered it."

Structure 3 — The false promise, stated without anger:
Line 1: What everyone is told, or what the document says.
Line 2: When the truth shows up instead. No exclamation, no outrage — just the fact landing.
Example:
"Every company gives their employees health insurance.
Most of them find out what it covers when someone is already sick."

Structure 4 — Stat + the human it becomes:
Line 1: The number. No "did you know", no setup. Just the number.
Line 2: Not what it means statistically — what it means for one specific person in one specific moment.
Example:
"Most corporate health policies have a waiting period clause for pre-existing conditions.
The average employee reads it for the first time from a hospital billing desk."

WHAT KILLS A HOOK — stop and rewrite the moment any of these appear:
- "I've seen...", "I've realized...", "I've learned...", "I've been thinking...", "I've been surprised...", "I saw this firsthand...", "I've seen this firsthand..."
- "I used to [any verb]..." — "I used to think", "I used to wait", "I used to build", "I used to believe" — all banned. Every form of "I used to" is forbidden in the hook.
- Action-position openers: "I sat...", "I stood...", "I spent...", "I walked...", "I arrived...", "I opened..." — these describe where the narrator was, not a fact. They are soft opening moves. Find the fact instead of the narrator's position.
- "I was surprised [to/by/when/that/how]...", "It surprised me...", "What surprised me was...", "I got surprised..." — every form of surprise as an opener is banned. Do not use any variation of this phrase anywhere in the hook.
- "I expected...", "I was nervous...", "I thought I'd...", "I thought [anything]..." — any sentence that begins with a feeling or expectation is almost always wrong. "I thought I'd spend my days pitching features." is banned — that is a feeling/expectation opener. Find the fact instead.
- "I noticed that...", "I've noticed that..." — banned in the hook. Start with the fact, not with yourself noticing it.
- "As a [role]", "In my experience", "Working in this space"
- A weak second line that labels the hook — the second line must carry weight, not react to the first. Banned second lines: "That's a surprising truth.", "And it changed everything.", "That stuck with me.", "I was wrong.", "It shows.", "They're not.", "That's not the reality.", "That's not how it works.", "That changed for me.", "I had to learn that.", "Turns out, it isn't.", "That's someone unable to do something they urgently need to do.", "That's someone who can't get help when they need it.", "That's an HR failure, not an employee failure.", "Neither is how people actually think about their health." — any short reactive sentence that just negates, confirms, or labels the first line without adding new information is banned. If your line 2 starts with "That's" followed by a judgment or category — it is almost certainly a label. Delete and replace with a specific new fact.
- Any question mark — ever. This includes question marks inside quoted speech: if the transcript contains "Why didn't we talk about it then?" do NOT quote that sentence in the post. Paraphrase it as a declarative statement instead, or skip it. No question mark anywhere in the final post.
- The lesson stated before the story — if they already know the point, there's no reason to read on
- Adjectives that tell the reader how to feel: "heartbreaking", "powerful", "eye-opening", "shocking", "surprising"
- More than 2 lines before the blank line
- Anything that could be the caption on a stock photo — if it could appear under a generic image of hands shaking or a sunrise over an office, it's too vague

After the 2-line hook: one blank line. Body starts.

You will receive a conversation transcript. Write one post the employee can publish immediately. It MUST sound like a specific human wrote it, not a brand.

<detect_story_type>
Before writing, identify which type this is. The type changes the structure:
- Personal/family: narrative arc, emotional honesty, lands on mission
- Customer/member: grounded in a specific human moment, not a feature highlight
- Health data: starts with the surprising number or fact, explains real-world stakes, challenges a common assumption
- Opinion/system: leads with the take directly, no windup, preserves the employee's actual point of view without softening
- Culture/team: specific, concrete detail that makes it feel real — not a values statement
</detect_story_type>

<content_rules>
MUST:
- Extract the emotionally or intellectually resonant core. Cut repetition and filler.
- Keep any strong specific phrases the employee actually said. If they land, use them verbatim.
- Be specific about the hard part. Name the actual feeling or fact. "It wasn't easy" is filler. "I sat in that room not knowing who to trust" is real.
- Use "I" like a person talking over coffee, not writing a press release.
- Weave in the employee's name and role if it adds context. Don't force it.
- Connect to Loop organically. It's context, not a pitch.

MUST NOT:
- Invent any fact, name, diagnosis, date, statistic, or outcome not in the transcript. This includes the hook: if no personal incident appears in the transcript, do not invent one. Do not fabricate a story about the employee's father, mother, spouse, colleague, or any family member having a medical experience. If the transcript contains only opinions and observations, the hook uses Structure 3 (false promise) or Structure 4 (stat/claim) — not a fabricated incident.
- Use any phrase from the EXAMPLES in this system prompt as the landing line or anywhere in the post. The hook structure examples, the landing line examples, and the anti-pattern examples in this prompt are FOR ILLUSTRATION ONLY. They are not from the transcript you received. If you find yourself writing "The average is rarely the problem. The tail is." or "The ticket read 'user confused after submitting.' That's a product problem, not a user problem." or any other example phrase from this prompt — STOP. Delete it. Go back to the actual transcript. The landing line must come from the transcript you received, not from any example in this prompt.
- Include customer names or identifying details. Anonymise completely.
- Use: "proud to work here", "great culture", "amazing team", "game-changer", "testament", "transformative", "at its core", "it's not just X, it's Y", "let's dive in", "in conclusion", "I wanted to share", "I never thought", "one conversation at a time", "I'm grateful to be part of", "I'm grateful for this", "I'm so grateful", "I'm grateful that", "deeply grateful", "That's what I'm here to do", "The insights are invaluable", "I'm changing that narrative".
- Use "As a [role]" anywhere in the post — not in the hook, not in the body, not at the end. This phrase is banned in every position. Also banned: "in my role as [role]", "in my work as [role]", "I see this gap/pattern in my work as", "as someone who [works/sees/does]", "working as a [role]". These are all the same move and all forbidden.
- Turn "At Loop" into a tagline or brand closer: "At Loop, we're working to make healthcare accessible.", "At Loop Health, we're committed to X.", "That's what we're changing at Loop.", "This is the difference we make at Loop." — these are ad copy. HOWEVER: if the story is about work at Loop — a member call, a product decision, a claim, an onboarding moment — Loop should appear naturally once where the story calls for it: "I joined Loop because...", "At Loop I've seen...", "That's what brought me to Loop." If the transcript is a general craft story with no Loop angle (a technical debt lesson, a regulatory call, a design principle), do NOT force Loop in — a natural absence is better than an awkward mention. Follow the transcript: if Loop is in the story, include it; if it isn't, leave it out.
- Use "Our team is working on...", "Our team is building...", "We're building tools that..." as abstract brand pitches. If the employee specifically mentioned their team or what they built in the transcript, include it — that's real context, not a pitch.
- Use these recycled filler closers that have no story-specific meaning: "Now I just make sure they know who to call", "The document wasn't the problem. It was never the document." — these phrases feel borrowed. The landing line must come from this story only.
- Write in third person. The post is always in first person — "I", not "[Name] says" or "[Name] notes". If you catch any third-person reference to the employee in the post, rewrite it as first person.
- End the post with a self-introduction: "I'm [Name], [Role] at Loop" or any variant. The post ends on the landing line, never a bio. This is an automatic failure — remove it before outputting.

LEGAL SAFETY — strip every one of these before outputting, no exceptions:
- Real names of any person other than the employee themselves (patients, family members, doctors, colleagues, executives, anyone)
- Names of any hospital, clinic, diagnostic centre, pharmacy, or healthcare facility
- Names of any insurance company, TPA, or employer other than Loop
- Any specific diagnosis, test result, medication name, or treatment detail that could identify a patient
- Dates, locations, or ward/department names that could identify a specific incident
- Any claim amount, policy number, or financial figure tied to a specific person
- Any statement that implies negligence, malpractice, fraud, or wrongdoing by a named or identifiable organisation

When any of the above appear in the transcript, keep the emotional truth and replace the specific with the general: "a hospital" not the hospital's name, "a family member" not their name, "a serious diagnosis" not the condition. The story must still feel real — just with no traceable details.
</content_rules>

<voice_rules>
- ZERO em dashes. Not one. Not anywhere. The character "—" must not appear in your output at all. These are the exact patterns where em dashes keep appearing — delete and rewrite each one: "We built X — Y, Z, W." → "We built X. Y, Z, W." or just "We built X." | "policy — but only because" → "policy, but only because" | "Not passive — patient." → "Not passive. Patient." | "The skill — balancing X — is crucial" → "The skill is making a defensible decision." Every em dash, replace with a period or comma. If the transcript contains an em dash, replace it in the post too. Zero means zero.
- No rule-of-three lists. Pick one thing and say it plainly.
- No inflation words: "pivotal", "marks a shift", "reflects broader trends", "landmark", "groundbreaking".
- No -ing tail phrases bolted onto sentences: "highlighting how...", "underscoring that...", "contributing to...".
- No passive hedges: "it could be argued", "in order to", "one might say".
- No paired opposites: "not just X but Y", "more than just X".
- Vary sentence length. Short ones. Then longer ones that take their time. Never three sentences in a row at the same rhythm.
- If the employee felt scared, frustrated, relieved, confused, or conflicted — say so plainly. No vague gloss.
- No promotional language. No "seamless", "intuitive", "empowering", "transformative".
- No signposting. Don't announce what you're about to say. Just say it.
- NO SELF-INTRO: Never include a sentence that introduces the employee by name or job title. Sentences like "I've been a Product Manager for 6 years", "I've spent years as a PM in health-tech", "I've worked as a designer for a decade", "As a PM at Loop, I've seen...", "I'm Priya, and I work in product" — all banned. The employee is writing on their own LinkedIn profile. Their followers already know them. Treat the reader as someone who already knows who the writer is. Never open with or include any form of self-introduction.
- No closing lesson formulas anywhere in the post — not in the body, not at the end. Every single one of these is banned: "This experience taught me...", "This has taught me...", "This taught me...", "That call taught me...", "That moment taught me...", "The experience taught me...", "I've learned that...", "I've learned to...", "I've come to realize...", "I've come to understand...", "In that moment, I realized...", "That's when I realized...", "That's when I knew...", "It was then that I realized...", "It was a wake-up call...", "That was a wake-up call...", "This experience reinforced...", "This experience changed...", "That experience changed...", "The key takeaway for me...", "The lesson here is...", "The lesson is clear...", "What I took away from this...", "What I took from this...", "That's a lesson that's stuck with me", "This has changed how I [verb]...", "I'm more careful now about...", "I'm more mindful of this now", "I've seen it time and again", "I've seen it firsthand", "I've seen firsthand how...", "I've been in [role/field] long enough to see...", "I was struck by a realization...", "I found myself reflecting...". End on the fact or the action, not the moral. If you wrote ANY of these — delete the entire sentence.
- No generic behavioral resolution endings: "Now I [generally do/focus/prioritize/make sure] X." — if it describes a habit anyone could have, it's not specific to this story. The landing line names the exact thing only this person in this situation would say.
</voice_rules>

<tone_rules>
The post must sound grounded and honest. Never arrogant, preachy, or self-congratulatory.

BANNED TONES — if any of these appear, rewrite the sentence:
- God complex: writing as if the person uniquely sees what others are too blind to see. "Most people don't get this." "Few people understand." "I finally realised what everyone else was missing." — all banned.
- Preachy: delivering a moral lesson from a position of superiority. The post shares an experience. It does not lecture.
- Self-congratulatory: "I always knew...", "I was right all along...", "People came to me because they knew I had the answer..."
- Humble-brag martyrdom: "Even though nobody believed in me...", "I did this when everyone said it couldn't be done..."
- Performance wisdom: writing as if the person is a sage dispensing insight rather than a human sharing something real.

RIGHT TONE: a smart colleague telling a true story honestly — including what they got wrong, what confused them, what surprised them. They're not performing. They had an experience, it changed something, and they're telling you plainly what.
</tone_rules>

<self_audit>
After your first draft, run three checks in order:

1. HOOK AUDIT — read only the first two lines. Ask each question. If any answer is yes, rewrite the hook before continuing.
   - Does line 1 start with or contain any of these banned openers? "I was surprised", "I've seen", "I've realized", "I've learned", "I've been thinking", "I used to", "I expected", "I was nervous", "I thought", "As a [role]", "In my experience", "Working in this space", "I sat", "I stood", "I spent", "I walked", "I arrived". If yes → rewrite with the underlying fact instead.
   - Is line 2 just a reaction to line 1 — "It shows up in...", "And it changed everything", "That stuck with me", "I was wrong", "It shows" — without adding a NEW specific fact? If yes → rewrite. Line 2 must contain information that could not be inferred from line 1.
   - Do the two lines feel unrelated — does line 2 pivot to a completely different subject than line 1 set up? If yes → rewrite.
   - Could either line appear under a stock photo of hands shaking or a sunrise over an office? If yes → rewrite.
   - Does the hook have at least one weight-bearing word or number — a specific time, number, place, or concrete fact? If both lines are vague claims with no anchor, rewrite at least one line around a specific detail from the transcript.
   - Count the words in your hook one by one: 1, 2, 3 ... If you reach 26 — STOP. Do not trim. Rewrite the entire hook from scratch, shorter. A rewrite always produces a better hook than a trim. Target 18–22 words. Trimming mid-sentence creates an incomplete thought and is worse than a fresh short hook.

2. LEGAL CHECK — scan for: real names of people or places, hospital/clinic names, insurer names, diagnoses, claim details, anything that could identify a specific person or incident. Replace every hit with a general equivalent.

3. EM DASH SCAN — before anything else in this step: read every single line of the post. Search for the character "—". If you find even one, replace it with a period or comma right now. Do not proceed until the post contains zero em dashes. This includes lines quoted from the transcript.

4. AI-TELL CHECK — scan line by line for:
   - Closing lesson formula — scan every sentence for ANY of these: "taught me", "I've learned", "I've come to realize", "I realized", "that's when I knew", "key takeaway", "the lesson", "this experience reinforced", "that experience changed", "wake-up call", "I was struck by", "I found myself reflecting". If found → delete the entire sentence.
   - Role-based framing: "As a [role]", "in my role as", "in my work as", "as someone who"
   - Self-introduction sentences anywhere in the post: "I've been a [role] for X years", "I've spent [X] years as a [role]", "I've worked as a [role]", "I'm [Name] and I [verb]" — delete the entire sentence
   - Self-introduction on last line: "I'm [Name]..." — delete the entire line
   - Brand tagline closer: "At Loop, we're working to...", "At Loop Health, we're committed to...", "That's what we're changing at Loop.", "That's what I'm here to do" — delete these. But DO include Loop naturally once where the story calls for it: "I joined Loop because", "At Loop I've seen", etc. A post with zero Loop mentions is also a miss.
   - Recycled filler closer: "Now I just make sure they know who to call", "That's what I'm here to do", "The insights are invaluable", "Now I just make sure [anything]"
   - Generic behavioral resolution: "Now I [generally] prioritize/focus/make sure X" — replace with the specific action from the story
   - Any em dash — if found, replace with a period or comma
   - Third person — any sentence referencing the employee by name ("Priya says", "Rohan notes") — rewrite as first person
   - Duplicate sentence — read all sentences; if any sentence appears twice, delete the second occurrence
   - Landing line that could close any post on any topic — if so, rewrite from the story
   Fix every hit before outputting.

5. HALLUCINATION CHECK — scan every sentence in the post and ask: did the employee actually say this in their transcript? Pay special attention to the last 2 sentences before your sign-off. If you find a sentence that sounds like a smart aphorism but you cannot locate it in the transcript — delete it. Common hallucinated phrases that must be deleted if found: "The average is rarely the problem. The tail is.", "The ticket read 'user confused after submitting.'", any phrase that sounds borrowed from a different story. If in doubt, delete it.

6. QUESTION MARK CHECK — scan every character in the post for "?". If found anywhere — rewrite that sentence as a declarative statement or delete it entirely.

Output only the final version.

OUTPUT ONLY THE POST. Do not show your reasoning, thinking, self-corrections, crossed-out phrases, notes to yourself, or any text that is not part of the final post. If you catch yourself writing things like "wasn't the right phrase", "this is not in the transcript", "people buy the 2am call being answered / wasn't the right phrase", or any internal note — delete those lines entirely. The content between POST_START and POST_END must contain only the post text itself, nothing else.
</self_audit>

<final_line_check>
Read the last line of your post. If it starts with "I'm [Name]" or contains "[Name], [Role]" or "[Role] at Loop" — delete it. The post ends on the landing line. Do this check every time, without exception.
</final_line_check>

<output_spec>
Target length: match the word range in the user message.

POST STRUCTURE:
  Line 1-2: Hook (see hook rules above). Max 2 lines. Then one blank line.
  Body: What happened, how it felt, why it matters.
  Connection to Loop: Organic — context, not a pitch.
  Landing line: Go back to the transcript. Find the single most specific, concrete phrase the person said. Copy it as close to verbatim as possible — do not rewrite it into a neater aphorism, do not polish it, do not summarise it. The transcript's own words are always stronger than your version of them. Do not add a sentence after it. Do not smooth it into a lesson. The transcript line IS the landing — stop there.
  LANDING LINE ANTI-PATTERNS — these are the exact failure modes. If your last line matches any of these patterns, delete it and go back to the transcript:
  - You rewrote the transcript line into a neater version: "The tail is where production finds you" instead of "The average is rarely the problem. The tail is." — banned. Use the original.
  - You added words to the transcript quote: "when he called" / "are working from the wrong starting point" / "in the end" — do not add a single word. Copy letter for letter. The only permitted change is replacing an em dash with a period or comma.
  - You already quoted this transcript phrase verbatim somewhere in the body of the post, and then used it again as the landing — pick a different strong transcript line for the close. Do not repeat yourself.
  - You added a sentence after a strong transcript quote: quote lands, then you add "And that's why X matters." — delete the added sentence. Stop at the quote.
  - You added a bridge or explanatory paragraph BEFORE the transcript landing quote as setup — delete the bridge. The transcript's own words need no setup sentence before them.
  - You prepended a framing clause onto a transcript line: "The lesson from that is structural: [transcript line]" — strip the framing clause. Start directly with the transcript's words.
  - You extracted a general principle from the story that is not near-verbatim from the transcript — delete it.
  - You ended on the wrong transcript line when two strong moments exist — use the final strong thing said in the transcript. If both are equally strong, prefer the one with a named number, a named action, or a physical detail over one with a general claim.
  - You ended with a behavioral resolution: "I stopped presenting. I started asking one question." — this is a lesson formula. Find the more specific transcript line instead.
  - Anything beginning with "And that's", "That's what", "That's why", "That's the", "The lesson", "This taught me", "Now I focus", "Now I make sure", "Now I ensure", "Now I prioritize" — all banned.
  LANDING LINE IS ONE SENTENCE: if your landing is two or three transcript sentences, use only the final strongest one. "Technical debt isn't usually a big obvious mistake. It's a series of small decisions where the cost is deferred often enough that nobody notices until the total is real." — choose one: the second is stronger. End there. Do not use both. NEVER merge two transcript sentences into a single invented sentence: if the transcript says "Leaders who treat the financial report as the conclusion. It's the starting point." — do NOT combine them into "Leaders who treat the financial report as the conclusion are looking at the starting point." That is a rewrite, not the transcript. The only permitted operation is choosing one sentence. Pick the final one. Use it verbatim.
  LANDING LINE MUST BE DECLARATIVE: if the strongest transcript phrase is a question, it cannot be the landing line. Questions are banned anywhere in the post. Find the nearest declarative statement in the transcript instead.
  LANDING LINE MUST STAND ALONE: the landing line is its own paragraph. Put a blank line before it. It must never be the last sentence of a larger paragraph. If your final paragraph has 2+ sentences and the last one is the landing line, insert a blank line before that final sentence so it stands alone. The landing line should look isolated on the page.
  FINAL LINE TEST — before outputting, read only your last line. Ask: can I find this phrase word-for-word in the transcript? If no, delete it. Keep deleting sentences from the end until you reach a line that is near-verbatim from the transcript. This is not optional. WORD-FOR-WORD means word-for-word: if the transcript says "everyone thinks" and you wrote "we often think" — that is a rewrite, delete it. If the transcript says "before the variance does" and you wrote the same — that is verbatim, keep it. If you added even one word that is not in the transcript, or changed even one word, that is a rewrite. Go back.
  - You used the transcript's strongest line mid-post and ended on an invented summary: "In a health app, speed and usefulness aren't always the same thing." — the strong transcript line must be LAST. Move it to the closing position and delete everything after it.
  - You added one closing sentence after the transcript quote — even a short one: "She wasn't asking for much." / "And that's what the job is." / "That's the whole job." — delete it. The transcript line already landed. You are undoing it.
  - You used the transcript's strongest line in the hook instead of saving it for the close: find the second-strongest specific phrase in the transcript and use that as the landing. Do not end on an invented principle because you spent the best line on the hook.
  If you cannot find a strong verbatim phrase: your last line must name the exact specific consequence or action from the story. "The ticket read 'user confused after submitting.' That's a product problem, not a user problem." is earned. "And that's what makes great design." is not.

NO HASHTAGS anywhere. The post ends on the landing line.
PLAIN TEXT ONLY. No markdown, no asterisks, no bold, no italics, no headers, no bullets.
Line breaks between paragraphs only. Straight quotes.

Before outputting: read the last line of your post. If it starts with "I'm [Name]" or contains "[Name], [Role]" or any form of self-introduction, delete that line. The post ends on the landing line.

RESPONSE FORMAT — output exactly this structure, nothing before POST_START, nothing after IMAGE_END. Both blocks are required — a response missing IMAGE_START...IMAGE_END is incomplete:

POST_START
(post text only — no image description here, no labels, just the post)
POST_END

IMAGE_START
(one specific real-photo concept — what is in the frame, the mood, why it fits — 2 sentences, real photo not illustration)
IMAGE_END
</output_spec>`;

// ── POST-PROCESSING ───────────────────────────────────────────────────────────
// Strips AI-tell patterns that survive the system prompt.
// Runs after extraction, before the response is sent to the client.

const ABBREV_RE = /\b(Dr|Mr|Mrs|Ms|Prof|St|vs|e\.g|i\.e|etc|Inc|Corp|Ltd|Sr|Jr|approx|dept|est|Rs|No)\./gi;
const ABBREV_PLACEHOLDER = '\x00DOT\x00';

function splitSentences(text) {
  // Protect abbreviations so "Dr. Smith" doesn't split into two sentences.
  const protected_ = text.replace(ABBREV_RE, m => m.slice(0, -1) + ABBREV_PLACEHOLDER);
  return protected_
    .split(/(?<=[.!?])\s+/)
    .map(s => s.replace(new RegExp(ABBREV_PLACEHOLDER, 'g'), '.').trim())
    .filter(Boolean);
}

// Sentence-level patterns that should be removed entirely.
// Only applied when the paragraph has more than one sentence, so we never
// produce an empty paragraph by removing the only remaining sentence.
const LESSON_SENTENCE_RE = [
  /^(this|that|the) (experience|approach|moment|call|conversation|interaction|realization|insight) (has |had )?(taught|shown|reinforced|shifted|transformed)\b/i,
  /^(this|that|the) (experience|moment|call) (has |had )?changed (how i|the way i|my |our |everything|me)\b/i,
  /^i'?ve (come to |)reali[sz]e[d]?\b/i,
  /^i'?ve (learned|come to know|come to understand|been in [a-z ]+ long enough to see)\b/i,
  /^(in|at) that moment[, ]+(i reali[sz]ed|i knew|it (hit|clicked|struck))/i,
  /^it (was |has been )?(a |an )?(wake-up call|game.changer|pivotal|turning point)\b/i,
  /^the (key )?takeaways?\b/i,
  /^the lesson (here|from this|i took|is|was)\b/i,
  /^what i (took away|took from|learned from|carry from)\b/i,
  /^i'?ve seen (it |this )?(firsthand|time and again|play out)\b/i,
  /^i was struck by\b/i,
  /^i found myself reflecting\b/i,
  /^(by doing so|through this approach|through this experience)[, ]/i,
  /^it'?s (not just about|a crucial reminder|a lesson|an important reminder|a powerful reminder)\b/i,
  /^it'?s a (valuable|crucial|important|significant|subtle but important|powerful) (lesson|reminder|distinction)\b/i,
  /^(this|that|it'?s) (is |was |has been )?(a |an )?(lesson|valuable lesson|important lesson|crucial lesson|key lesson|wake-up call|turning point|game.changer)\b/i,
  /^as engineers?[, ]/i,
  /^as designers?[, ]/i,
  /^now i (just |generally |always |)?(make sure|focus on|prioritize|ensure|think about|approach|ask myself|ask|try to|start|do|tell|say|check|write|use|keep|see|understand|realize|realise)\b/i,
  /^now[, ] (every time|when(ever)?|before|after|during)\b/i,
  /^(the|this) (goal|aim|objective) (is|was|should be|of .{0,40} is)\b/i,
  /^i still remember\b/i,
  /^i still think about\b/i,
  /^i'?m still (thinking about|reflecting on|processing)\b/i,
  /^it'?s (still |)(a |an )?(good |powerful |valuable |important |helpful |useful )?(reminder|lesson|takeaway)\b/i,
  /^i'?m grateful\b/i,
  /^i'?m constantly (looking for|thinking about|working|trying)\b/i,
  /^what struck me\b/i,
  /^moments like (this|these)\b/i,
  /^experiences like (this|these)\b/i,
  /^those ([\d]+) minutes? (made|changed|saved|showed|proved|reminded)\b/i,
  /^it was a moment that\b/i,
  /^that was the moment (i|we) (understood|realized|saw|knew|felt)\b/i,
  /^that('s| is| was) (something|a lesson|a reminder|what|the moment|the realization)\b/i,
  /^that'?s (the thing|what|how|why|where)\b/i,
  // "A clear lesson" / "a simple lesson" / "a key lesson" variants
  /^(a |one )(clear|simple|key|big|important|crucial|valuable|powerful|subtle) (lesson|takeaway|reminder|truth|insight)\b/i,
  // "reminded me why / what / how"
  /^(it |that moment |this |the experience )?(reminded me|reminds me) (why|what|how|that)\b/i,
  // "X is not just about" patterns
  /^(this|that|it) (is |was |isn'?t |wasn'?t )?(just |only )?about\b/i,
  // Self-introduction sentences — banned on LinkedIn (followers know who they are)
  /^i'?ve been (a|an) [a-z][^.]{2,80}(for \d|for (about|over|nearly|around|the past|more than|almost|close to))/i,
  /^i'?ve spent [^.]{0,30} as (a|an) [a-z][^.]{2,80}/i,
  /^i have been (working |)(as |)(a |an )[a-z][^.]{2,80}(for|over|the past)/i,
  /^i'?ve worked (as|in) (a |an )?[a-z][^.]{2,80}/i,
  /^i'?m [A-Z][a-z]+[, ].{0,60}(and |at |,).{0,60}(loop|my role|i (work|lead|manage|build|run))/i,
  // LLM meta-commentary that leaks into output
  /\bis not required at the end\b/i,
  /\bif it helps to confirm my identity\b/i,
  /^[A-Z][a-z]+ is not (required|needed|necessary)\b/i,
  /^(feel free|please note|note that|just to clarify|as a note)\b/i,
  /^i('?ll| will| can| could) (keep|use|add|include|mention|note|adjust|make sure|ensure)\b/i,
  /^let me know if\b/i,
  /^here('?s| is) (the post|your post|a (draft|version)|what i (came up with|wrote))\b/i,
];

// Non-role "As a X" phrases that must NOT be stripped by the role-prefix remover
const ROLE_EXCLUSIONS = /^As an? (result|whole|matter|team|company|group|collective|community|society|country|nation|part|side effect|consequence|follow.?up|follow|note|caveat|disclaimer|bonus|mother|father|parent|child|daughter|son|sibling|brother|sister|spouse|partner|patient|caregiver|survivor|kid|outsider|immigrant|first.gen)\b/i;

// Whole-paragraph patterns — remove the entire paragraph.
const FILLER_PARA_RE = [
  /^i'?d (love|like) to (hear|share|know)\b/i,
  /^(by doing so|through this)[, ].{0,120}$/i,
  /^it'?s not (just|only) about\b/i,
  /^i'?m (excited|happy|proud|committed) to\b/i,
  /^i'?m grateful\b/i,
  /^(what do you think|let me know|share your thoughts)\b/i,
  /^i'?d (love|like) to know\b/i,
  /^those \d+ minutes? (made all the difference|changed everything|saved|proved)\b/i,
  /^(a |one )(clear|simple|key|big|important|crucial|valuable|powerful) (lesson|takeaway|reminder)\b/i,
  /\bis not required at the end\b/i,
  /\bif it helps to confirm my identity\b/i,
  /^\[?[A-Z][a-z]+ (is|was|are|were) not (required|needed|necessary)\b/i,
];

// Find the best word index to cut a sentence at — prefers cutting before a preposition or conjunction
// so the trimmed sentence ends at a natural phrase boundary rather than mid-thought.
function findNaturalCutPoint(words, maxLen) {
  const CUT_BEFORE = new Set([
    'at', 'in', 'on', 'for', 'to', 'with', 'by', 'from', 'about', 'of',
    'but', 'and', 'or', 'because', 'that', 'which', 'when', 'while',
    'before', 'after', 'as', 'despite', 'though', 'although', 'since',
    'unless', 'until', 'where', 'whether', 'who', 'whose',
  ]);
  // Search backwards from maxLen for a natural cut point
  for (let i = Math.min(maxLen, words.length) - 1; i >= Math.max(4, maxLen - 6); i--) {
    if (CUT_BEFORE.has((words[i] || '').toLowerCase())) {
      return i; // cut before this index (exclusive)
    }
  }
  return maxLen; // fallback
}

function cleanPost(post) {
  // 1. Em dashes → period or comma
  //    " — Capital" → ". Capital"  (new independent clause)
  //    " — lowercase" → ", "       (appositive / continuation)
  post = post.replace(/ — ([A-Z])/g, (_, c) => '. ' + c);
  post = post.replace(/ — /g, ', ');
  post = post.replace(/—([A-Z])/g, (_, c) => '. ' + c);
  post = post.replace(/—/g, ', ');
  // Clean up artifacts
  post = post.replace(/\.\s+\./g, '.');
  post = post.replace(/,\s*,/g, ',');

  // 2. Paragraph-level processing
  let paras = post.split('\n\n');

  paras = paras.map(para => {
    const trimmed = para.trim();
    if (!trimmed) return '';

    // Remove entire paragraph if it's pure filler
    if (FILLER_PARA_RE.some(re => re.test(trimmed))) return '';

    // Strip "As a/an [Role...]," prefix from sentences — excludes common non-role phrases (see module-level ROLE_EXCLUSIONS)
    let p = para
      .replace(/\bAs an? [A-Za-z][^,.]{2,80}(?:,\s*|\s+at [A-Za-z ]{1,40},\s*)/g, (m) => ROLE_EXCLUSIONS.test(m) ? m : '')
      .replace(/\bIn my (role|work) as [A-Za-z][^,.]{2,80},\s*/g, '')
      .replace(/\bAs someone who [^,]{2,80},\s*/g, '');

    // Sentence-level: remove lesson formula sentences
    const sentences = splitSentences(p);
    // Single-sentence paragraph: remove if it's a lesson formula (whole para is the formula)
    if (sentences.length === 1) {
      if (LESSON_SENTENCE_RE.some(re => re.test(sentences[0].trim()))) return '';
    } else {
      const filtered = sentences.filter(s => !LESSON_SENTENCE_RE.some(re => re.test(s.trim())));
      if (filtered.length > 0) p = filtered.join(' ');
    }

    return p;
  });

  // 3. Remove trailing filler paragraphs — keep at least 1 paragraph (the landing)
  for (let pass = 0; pass < 3; pass++) {
    if (paras.filter(p => p.trim()).length <= 1) break;
    const last = paras[paras.length - 1].trim();
    if (!last || FILLER_PARA_RE.some(re => re.test(last))) {
      paras.pop();
    }
  }

  let result = paras
    .filter(p => p.trim())
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 4. Strip any sentence containing a question mark (banned per system prompt)
  result = result.split('\n\n').map(para => {
    if (!para.trim()) return '';
    const sentences = splitSentences(para);
    if (sentences.length <= 1) {
      // If the whole paragraph is a question, remove it entirely
      return para.includes('?') ? '' : para;
    }
    const filtered = sentences.filter(s => !s.includes('?'));
    return filtered.length > 0 ? filtered.join(' ') : '';
  }).filter(p => p.trim()).join('\n\n');

  // 5. Hook cleanup: if the first paragraph has 3+ sentences, trim to 2
  //    Each hook line should be on its own line — normalise
  const hookedParts = result.split('\n\n');
  if (hookedParts.length >= 2) {
    const hookSentences = splitSentences(hookedParts[0].replace(/\n/g, ' '));
    if (hookSentences.length > 2) {
      hookedParts[0] = hookSentences.slice(0, 2).join('\n');
      result = hookedParts.join('\n\n');
    } else if (hookSentences.length === 2) {
      // Ensure the 2 sentences are on separate lines (not run together)
      hookedParts[0] = hookSentences.join('\n');
      result = hookedParts.join('\n\n');
    }
  }

  // 6. Deduplicate sentences — remove any sentence that appears more than once
  const seenNorm = new Set();
  result = result.split('\n\n').map(para => {
    if (!para.trim()) return '';
    const sentences = splitSentences(para);
    const deduped = sentences.filter(s => {
      const norm = s.trim().toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ');
      if (seenNorm.has(norm)) return false;
      seenNorm.add(norm);
      return true;
    });
    return deduped.length > 0 ? deduped.join(' ') : '';
  }).filter(p => p.trim()).join('\n\n');

  // 7. Enforce hook word count <= 25 — smart trim to natural phrase boundaries.
  // Step 6 deduplication joins hook sentences with spaces, destroying the \n structure.
  // Use splitSentences to recover the two hook lines regardless of how they were joined.
  const hookEnforceParts = result.split('\n\n');
  if (hookEnforceParts.length >= 2) {
    const rawHookSents = splitSentences(hookEnforceParts[0].replace(/\n/g, ' '));
    if (rawHookSents.length >= 2) {
      let h1 = rawHookSents[0].trim();
      let h2 = rawHookSents[1].trim();
      let safety = 0;
      while ((h1 + ' ' + h2).trim().split(/\s+/).filter(Boolean).length > 25 && safety++ < 20) {
        const w1 = h1.split(/\s+/).filter(Boolean).length;
        const w2 = h2.split(/\s+/).filter(Boolean).length;
        if (w1 <= 4 && w2 <= 4) break;
        const trimLine = (line) => {
          const words = line.replace(/[.!?]$/, '').trim().split(/\s+/).filter(Boolean);
          const cutAt = findNaturalCutPoint(words, words.length - 1);
          return words.slice(0, cutAt).join(' ') + '.';
        };
        if (w1 >= w2 && w1 > 4) {
          h1 = trimLine(h1);
        } else if (w2 > 4) {
          h2 = trimLine(h2);
        } else break;
      }
      // Always restore proper 2-line hook format (step 6 may have flattened it)
      hookEnforceParts[0] = h1 + '\n' + h2;
      result = hookEnforceParts.join('\n\n');
    }
  }

  return result.trim();
}
// ─────────────────────────────────────────────────────────────────────────────

const WORD_RANGES = {
  short: '100-150 words',
  medium: '180-240 words',
  long: '250-300 words',
};

// Minimum acceptable word counts (75% of lower bound)
// If the post falls below this after post-processing, we do one retry
const WORD_MIN = { short: 75, medium: 135, long: 185 };

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

router.post(
  '/',
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('role').trim().notEmpty().isLength({ max: 200 }),
  body('length').isIn(['short', 'medium', 'long']),
  body('messages').isArray({ min: 1, max: 40 }).custom(msgs => {
    for (let i = 1; i < msgs.length; i++) {
      if (msgs[i].role === msgs[i - 1].role) throw new Error('messages must alternate between user and assistant');
    }
    return true;
  }),
  body('messages.*.role').isIn(['user', 'assistant']),
  body('messages.*.content').isString().notEmpty().isLength({ max: 8000 }),
  body('imageBase64').optional().isString().isLength({ max: 8_000_000 }),
  body('imageMimeType').optional().isIn(['image/jpeg', 'image/png', 'image/webp'])
    .custom((val, { req }) => {
      if (req.body.imageBase64 && !val) throw new Error('imageMimeType required when imageBase64 is present');
      if (val && !req.body.imageBase64) throw new Error('imageBase64 required when imageMimeType is present');
      return true;
    }),
  body('hookOnly').optional().isBoolean(),
  body('currentPost').optional().isString().isLength({ max: 15000 }),
  body('regenParagraph').optional().isBoolean(),
  body('paragraphIndex').optional().isInt({ min: 0, max: 50 }),
  body('paragraphText').optional().isString().isLength({ max: 3000 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const { name, role, length, messages, imageBase64, imageMimeType, hookOnly, currentPost, regenParagraph, paragraphIndex, paragraphText } = req.body;
    const wordRange = WORD_RANGES[length];
    // Strip chars used in HTML injection, prompt injection (curly braces, XML tags), and control chars
    const UNSAFE_RE = /[<>{}\[\]`\x00-\x1f\x7f]/g;
    const safeName = name.replace(UNSAFE_RE, '').trim();
    const safeRole = role.replace(UNSAFE_RE, '').trim();

    // ── HOOK-ONLY REGEN ────────────────────────────────────────────────────────
    if (hookOnly === true) {
      if (!currentPost) return res.status(400).json({ error: 'currentPost required for hookOnly mode' });

      if (MOCK_MODE) {
        await new Promise(r => setTimeout(r, 800));
        const mockBody = currentPost.split('\n\n').slice(1).join('\n\n');
        return res.json({ post: 'Something broke in that system.\nNobody told the member it had.\n\n' + mockBody });
      }

      const firstBlank = currentPost.indexOf('\n\n');
      const postBody = firstBlank >= 0 ? currentPost.slice(firstBlank + 2) : '';
      const currentHook = firstBlank >= 0 ? currentPost.slice(0, firstBlank) : currentPost;

      const hookTranscript = messages
        .filter(m => !(m.role === 'assistant' && m.content.includes('Give me a moment to turn this into your post')))
        .map(m => `${m.role === 'assistant' ? 'Guide' : safeName}: ${m.content}`)
        .join('\n\n');

      try {
        const hookResponse = await groq.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          max_tokens: 120,
          temperature: 0.9,
          messages: [
            {
              role: 'system',
              content: `You write LinkedIn post hooks for Loop Health employees. The post is written in FIRST PERSON by the employee — never reference them by name in third person.

HOOK RULES — all mandatory:
- Exactly 2 lines. One complete sentence per line (subject + finite verb required on each line — fragments banned). Separated by a newline.
- Combined word count 25 words or fewer. Count one by one. Hard stop at 26 — rewrite from scratch, do not trim mid-sentence.
- Aim for 18–22 words — shorter forces the best fact selection.
- Line 1: one specific fact, moment, number, or named detail from the transcript. Every strong hook has ONE weight-bearing word or number — find it and build around it.
- Line 2: a NEW concrete fact that line 1 set up — not a reaction, not a label. Ask: if someone read ONLY line 2, would they learn something new? If not, rewrite. Banned second lines: "And that changed everything.", "I was wrong.", "It shows.", "That's not how it works.", "That changed for me.", "Neither is how people actually think." — any short reactive or negating sentence is banned.
- SCROLL-STOP TEST: a LinkedIn user scrolling past 500 posts — does this hook make them stop? The bar is not "good" — it is "impossible to scroll past." If not certain, rewrite.
- No em dashes. No question marks anywhere.
- Banned openers: "I've seen", "I've realized", "I've learned", "I used to", "As a [role]", "I sat", "I stood", "I spent", "I walked", "I was surprised", "I expected", "I thought", "I noticed that".
- DIFFERENT ANGLE from the current hook — do not reuse the same fact or framing.
- Output ONLY the 2 hook lines. Nothing else.`,
            },
            {
              role: 'user',
              content: `Write a new hook using a different angle than the current one.

CURRENT HOOK (do NOT reuse this angle):
${currentHook}

TRANSCRIPT:
${hookTranscript}

Output exactly 2 lines only.`,
            },
          ],
        });

        let newHook = hookResponse.choices[0].message.content
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .trim();

        // Take only the first 2 non-empty lines
        const rawLines = newHook.split('\n').map(l => l.trim()).filter(Boolean);
        let h1 = rawLines[0] || '';
        let h2 = rawLines[1] || '';

        // Clean em dashes
        const cleanHookLine = s =>
          s.replace(/ — ([A-Z])/g, (_, c) => '. ' + c)
           .replace(/ — /g, ', ')
           .replace(/—/g, ', ');
        h1 = cleanHookLine(h1);
        h2 = cleanHookLine(h2);

        // Enforce word count <= 25
        let _safety1 = 0;
        while ((h1 + ' ' + h2).trim().split(/\s+/).filter(Boolean).length > 25 && _safety1++ < 20) {
          const w1 = h1.split(/\s+/).filter(Boolean).length;
          const w2 = h2.split(/\s+/).filter(Boolean).length;
          if (w1 <= 4 && w2 <= 4) break;
          if (w1 >= w2 && w1 > 4) {
            const words = h1.replace(/[.!?]$/, '').trim().split(/\s+/);
            words.pop();
            h1 = words.join(' ') + '.';
          } else if (w2 > 4) {
            const words = h2.replace(/[.!?]$/, '').trim().split(/\s+/);
            words.pop();
            h2 = words.join(' ') + '.';
          } else break;
        }

        newHook = h1 + '\n' + h2;
        const newPost = postBody ? newHook + '\n\n' + postBody : newHook;
        return res.json({ post: newPost });
      } catch (err) {
        console.error('Hook regen error:', err.status ?? 500, err.message);
        return res.status(500).json({ error: 'Failed to regenerate hook. Please try again.' });
      }
    }
    // ── END HOOK-ONLY REGEN ────────────────────────────────────────────────────

    // ── PARAGRAPH REGEN ────────────────────────────────────────────────────────
    if (regenParagraph === true) {
      if (!currentPost || paragraphIndex == null || !paragraphText) {
        return res.status(400).json({ error: 'currentPost, paragraphIndex, and paragraphText required for regenParagraph mode' });
      }

      if (MOCK_MODE) {
        await new Promise(r => setTimeout(r, 700));
        const paras = currentPost.split('\n\n');
        paras[paragraphIndex] = '[Rewritten paragraph would appear here]';
        return res.json({ post: paras.join('\n\n') });
      }

      const paraTranscript = messages
        .filter(m => !(m.role === 'assistant' && m.content.includes('Give me a moment to turn this into your post')))
        .map(m => `${m.role === 'assistant' ? 'Guide' : safeName}: ${m.content}`)
        .join('\n\n');

      const isHook = paragraphIndex === 0;

      try {
        const paraResponse = await groq.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          max_tokens: isHook ? 120 : 300,
          temperature: 0.85,
          messages: [
            {
              role: 'system',
              content: isHook
                ? `You write LinkedIn post hooks. Rules:
- Exactly 2 lines. One complete sentence per line (subject + finite verb required). Separated by a newline.
- Combined word count must be 25 words or fewer. Hard limit.
- Line 1: one specific fact, moment, number, or detail from the transcript.
- Line 2: a NEW concrete fact that line 1 set up — not a reaction, not a label.
- No em dashes. No question marks.
- Banned openers: "I've seen", "I've realized", "I used to", "As a [role]", "I sat", "I stood", "I spent", "I walked", "I was surprised".
- Must create an information gap — a busy professional must stop scrolling and click "see more".
- DIFFERENT ANGLE from the current hook shown below.
- Output ONLY the 2 hook lines. No labels, nothing else.`
                : `You are rewriting one paragraph of a LinkedIn post written in FIRST PERSON by the employee themselves. This post lives on THEIR LinkedIn profile — they are the author and narrator.

MANDATORY RULES:
- FIRST PERSON ONLY. Every sentence uses "I", "my", "me", "we", "our". NEVER write the employee's name as a subject or reference them in third person. "[Name] noted that", "[Name] said", "[Name] observed", "[Name] found" — all banned. The employee wrote this. They are speaking. Use "I".
- Same voice, same facts, same meaning — fresh phrasing and sentence structure only.
- No em dashes anywhere. No question marks anywhere.
- No lesson formulas: "This taught me", "The lesson is", "I've learned", "I've come to realize", "That's when I knew", "I've come to understand", "This experience reinforced", "What I took away".
- No filler closers: "Now I make sure", "And that's what I'm here to do", "I'm passionate about", "one conversation at a time".
- No self-introduction sentences. No "As a [role]", "In my role as", "I've been a [role] for X years".
- No generic brand pitches: "At Loop, we're working to...", "That's what we're changing at Loop."
- No rule-of-three lists. No inflation words: "pivotal", "transformative", "groundbreaking".
- Keep roughly the same length as the original paragraph.
- Output ONLY the rewritten paragraph. No labels, no commentary, nothing else.`,
            },
            {
              role: 'user',
              content: isHook
                ? `Write a new hook using a different angle than the current one.

CURRENT HOOK (do NOT reuse this angle):
${paragraphText}

FULL POST FOR CONTEXT:
${currentPost}

TRANSCRIPT:
${paraTranscript}

Output exactly 2 lines only.`
                : `Rewrite this paragraph in a fresh way. Keep the same voice and facts.

PARAGRAPH TO REWRITE:
${paragraphText}

FULL POST FOR CONTEXT:
${currentPost}

TRANSCRIPT:
${paraTranscript}

Output only the rewritten paragraph.`,
            },
          ],
        });

        let newPara = paraResponse.choices[0].message.content
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .trim();

        // For hook: take only first 2 non-empty lines and enforce word count
        if (isHook) {
          const rawLines = newPara.split('\n').map(l => l.trim()).filter(Boolean);
          let h1 = rawLines[0] || '';
          let h2 = rawLines[1] || '';
          const cleanLine = s => s.replace(/ — ([A-Z])/g, (_, c) => '. ' + c).replace(/ — /g, ', ').replace(/—/g, ', ');
          h1 = cleanLine(h1);
          h2 = cleanLine(h2);
          let _safety2 = 0;
          while ((h1 + ' ' + h2).trim().split(/\s+/).filter(Boolean).length > 25 && _safety2++ < 20) {
            const w1 = h1.split(/\s+/).filter(Boolean).length;
            const w2 = h2.split(/\s+/).filter(Boolean).length;
            if (w1 <= 4 && w2 <= 4) break;
            if (w1 >= w2 && w1 > 4) { const words = h1.replace(/[.!?]$/, '').trim().split(/\s+/); words.pop(); h1 = words.join(' ') + '.'; }
            else if (w2 > 4) { const words = h2.replace(/[.!?]$/, '').trim().split(/\s+/); words.pop(); h2 = words.join(' ') + '.'; }
            else break;
          }
          newPara = h1 + '\n' + h2;
        } else {
          // Clean em dashes from body paragraph
          newPara = newPara.replace(/ — ([A-Z])/g, (_, c) => '. ' + c).replace(/ — /g, ', ').replace(/—/g, ', ');
        }

        // Strip third-person references to the employee by name
        // e.g. "Priya noted that" → "I noted that", "Priya found" → "I found"
        const firstNameEscaped = safeName.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (firstNameEscaped.length > 1) {
          newPara = newPara.replace(
            new RegExp(`\\b${firstNameEscaped}\\s+(noted|said|found|observed|mentioned|explained|added|shared|pointed out|recalled|emphasized|highlighted)\\b`, 'gi'),
            (_, verb) => `I ${verb}`
          );
          newPara = newPara.replace(
            new RegExp(`\\b${firstNameEscaped}'s\\b`, 'gi'),
            'my'
          );
        }

        // For body paragraphs: strip lesson-formula sentences inline
        // (don't run full cleanPost — it strips lone paragraphs as filler)
        if (!isHook) {
          const sentences = splitSentences(newPara);
          if (sentences.length > 1) {
            const filtered = sentences.filter(s => !LESSON_SENTENCE_RE.some(re => re.test(s.trim())));
            if (filtered.length > 0) newPara = filtered.join(' ');
          } else if (sentences.length === 1 && LESSON_SENTENCE_RE.some(re => re.test(sentences[0].trim()))) {
            // Whole paragraph is a lesson formula — keep original rather than return empty
            newPara = paragraphText;
          }
          // Strip "As a [Role]," prefix
          newPara = newPara
            .replace(/\bAs an? [A-Za-z][^,.]{2,80}(?:,\s*|\s+at [A-Za-z ]{1,40},\s*)/g, (m) => ROLE_EXCLUSIONS.test(m) ? m : '')
            .replace(/\bIn my (role|work) as [A-Za-z][^,.]{2,80},\s*/g, '');
        }

        // Swap the paragraph in the full post
        const paras = currentPost.split('\n\n');
        if (paragraphIndex >= paras.length) {
          return res.status(400).json({ error: 'Paragraph index out of range — post may have changed.' });
        }
        paras[paragraphIndex] = newPara;
        const updatedPost = paras.join('\n\n');

        return res.json({ post: updatedPost });
      } catch (err) {
        console.error('Paragraph regen error:', err.status ?? 500, err.message);
        return res.status(500).json({ error: 'Failed to rewrite paragraph. Please try again.' });
      }
    }
    // ── END PARAGRAPH REGEN ────────────────────────────────────────────────────

    const transcript = messages
      .filter(m => !( // strip the bot's closing handoff line — it's a meta-instruction, not interview content
        m.role === 'assistant' &&
        m.content.includes('Give me a moment to turn this into your post')
      ))
      .map(m => `${m.role === 'assistant' ? 'Guide' : safeName}: ${m.content}`)
      .join('\n\n');

    // ── MOCK MODE ──────────────────────────────────────────────────────────────
    // Replace this block with the real Claude call below when MOCK_MODE=false
    if (MOCK_MODE) {
      await new Promise(r => setTimeout(r, 1800));
      return res.json({ post: MOCK_POST, imageIdea: MOCK_IMAGE_IDEA });
    }
    // ── END MOCK ───────────────────────────────────────────────────────────────

    try {
      const userText = `Write a LinkedIn post for this person.

CONTEXT:
Name: ${safeName}
Role: ${safeRole}
Target length: ${wordRange} — this is a hard requirement. Count the words in your post before outputting. If the post is below ${WORD_MIN[length]} words, expand the body before outputting. Do not output a post below ${WORD_MIN[length]} words under any circumstances.

INTERVIEW TRANSCRIPT:
Note: "Guide" in the transcript is an automated interview bot — not a real person. Never mention or reference Guide in the post. The post is written entirely from ${safeName}'s perspective.

${transcript}
${imageBase64 ? `
ATTACHED IMAGE: The employee has shared an image as extra context. Study it carefully before writing.

- If it is a screenshot with text, numbers, or data: extract those facts and weave them into the post.
- If it is a photo of a real event, place, or group of people: note what you can see — how many people, what they are doing, what the setting is — and use those specific visual details to make the post more concrete and grounded. Do not just describe the photo generically. Pull the scene into the story.
- Either way: the image was shared because it is relevant. Use what is actually visible in it. Do not ignore it.
` : ''}
Write a ${wordRange} LinkedIn post built entirely from what they said${imageBase64 ? ' and what is visible in the image' : ''}. Sound like a real person wrote it. Do not invent anything not found in the transcript or image.

HOOK REMINDER — the post MUST open with exactly 2 short lines, each its own sentence, followed by one blank line. Line 1: one specific fact or moment. Line 2: a NEW fact that cannot be inferred from line 1. Then a blank line. Then the body starts. Do NOT open with "I've been...", "I work...", "I've noticed...", "I've been working with...", or any soft multi-clause opener. If no concrete incident exists, use hook Structure 3 or 4 from the system prompt.

Your response MUST contain both blocks: POST_START...POST_END and IMAGE_START...IMAGE_END. A response without the IMAGE block is incomplete.`;

      const userMessage = imageBase64
        ? {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
            ],
          }
        : { role: 'user', content: userText };

      const message = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 3000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          userMessage,
        ],
      });

      const raw = message.choices[0].message.content
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .trim();

      const postMatch  = raw.match(/POST_START([\s\S]*?)POST_END/i);
      const imageMatch = raw.match(/IMAGE_START([\s\S]*?)IMAGE_END/i);

      let post = postMatch ? postMatch[1].trim() : raw;
      // Use extracted idea if present; otherwise fall back to a sensible default
      const imageIdea = imageMatch
        ? imageMatch[1].trim()
        : `A candid workplace moment — someone at a desk or in a meeting, expression focused or thoughtful. Natural light, no props. The mood should feel real, not staged.`;

      // Fallback safety: strip any delimiter or image block that leaked into the post.
      // The orphaned IMAGE_START fallback only fires at line-start to avoid truncating
      // post content that literally contains the word "IMAGE_START" mid-sentence.
      post = post
        .replace(/IMAGE_START[\s\S]*?IMAGE_END/gi, '')
        .replace(/(?:^|\n)IMAGE_START[\s\S]*/gi, '')
        .replace(/POST_START/gi, '')
        .replace(/POST_END/gi, '')
        .trim();

      // Normalize lines that are only whitespace to empty lines, then collapse 3+ blank lines to one
      post = post.split('\n').map(line => line.trim() === '' ? '' : line).join('\n');
      post = post.replace(/\n{3,}/g, '\n\n');

      // Strip self-intro sign-off if model added one despite instructions.
      // Check as standalone last line first
      const postLines = post.split('\n');
      const lastLine = postLines[postLines.length - 1].trim();
      const SELF_INTRO_RE = /(?:^|\.\s+)(I'?m [A-Z][a-z][^.]*(?:PM|manager|engineer|designer|lead|head|director|founder|co-founder|VP|CEO|CTO|CFO|COO|analyst|associate|consultant|intern|specialist|coordinator|advisor|strategist|recruiter|partner|executive)[^.]*\.)/i;
      if (
        postLines.length > 1 &&
        (
          /^I'?m [A-Z][a-z]/.test(lastLine) ||
          /^I am [A-Z][a-z]/.test(lastLine) ||
          /^[A-Z][a-z]+ [A-Z][a-z]+\s*[|,]/.test(lastLine)  // "FirstName LastName | Role" or "FirstName LastName, Role"
        )
      ) {
        post = postLines.slice(0, -1).join('\n').trim();
      } else {
        // Also catch self-intro embedded as the last sentence of the last paragraph
        // e.g. "...better product manager. I'm Priya, PM at Loop."
        const lastParaIdx = post.lastIndexOf('\n\n');
        const lastPara = lastParaIdx >= 0 ? post.slice(lastParaIdx + 2) : post;
        const selfIntroSentenceRE = /\s+I'?m [A-Z][a-z][^.]*(?:,\s*[A-Z]|at Loop)[^.]*\.\s*$/i;
        if (selfIntroSentenceRE.test(lastPara)) {
          const cleaned = lastPara.replace(selfIntroSentenceRE, '').trim();
          post = lastParaIdx >= 0
            ? post.slice(0, lastParaIdx + 2) + cleaned
            : cleaned;
          post = post.trim();
        }
      }

      // ── POST-PROCESSING: strip AI tells the model couldn't self-correct ─────
      const postBeforeClean = post;
      post = cleanPost(post);
      if (!post.trim()) post = postBeforeClean; // cleanPost removed everything — fall back
      // ─────────────────────────────────────────────────────────────────────────

      // ── WORD COUNT GUARD: expand pass if post is too short ───────────────────
      // Rather than asking the LLM to start over (which just produces the same
      // length again), we send the draft back and ask it to add one specific
      // detail per paragraph from the transcript. This preserves the hook and
      // structure that already worked while targeting the word minimum.
      if (countWords(post) < WORD_MIN[length]) {
        try {
          const draftWordCount = countWords(post);
          const expandUserText = `You wrote this LinkedIn post:

---
${post}
---

It is only ${draftWordCount} words. The target is ${wordRange} (hard minimum: ${WORD_MIN[length]} words).

Here is the full interview transcript:

${transcript}

TASK: Expand the post to reach at least ${WORD_MIN[length]} words by going through each paragraph and adding one specific concrete detail or moment from the transcript that is not yet in the post. Do not add new standalone paragraphs — deepen the existing ones. Do not invent anything not in the transcript. Keep the exact same hook, same structure, same landing line, same voice. Every added sentence must come directly from something the person said.

Your response MUST contain both blocks: POST_START...POST_END and IMAGE_START...IMAGE_END.`;

          const expandUserMessage = imageBase64
            ? { role: 'user', content: [{ type: 'text', text: expandUserText }, { type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } }] }
            : { role: 'user', content: expandUserText };

          const expandResponse = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            max_tokens: 3000,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              expandUserMessage,
            ],
          });

          const expandRaw = expandResponse.choices[0].message.content
            .replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          const expandMatch = expandRaw.match(/POST_START([\s\S]*?)POST_END/i);

          if (expandMatch) {
            let expandedPost = expandMatch[1].trim()
              .replace(/IMAGE_START[\s\S]*?IMAGE_END/gi, '')
              .replace(/(?:^|\n)IMAGE_START[\s\S]*/gi, '')
              .replace(/POST_START/gi, '')
              .replace(/POST_END/gi, '')
              .trim();
            expandedPost = expandedPost.split('\n').map(l => l.trim() === '' ? '' : l).join('\n');
            expandedPost = expandedPost.replace(/\n{3,}/g, '\n\n');
            const expandBeforeClean = expandedPost;
            expandedPost = cleanPost(expandedPost);
            if (!expandedPost.trim()) expandedPost = expandBeforeClean;
            // Accept expanded version if it meets the minimum, or at least beats the draft
            if (countWords(expandedPost) >= WORD_MIN[length] || countWords(expandedPost) > draftWordCount) {
              post = expandedPost;
              console.log(`Expand pass: ${draftWordCount} → ${countWords(post)} words`);
            }
          }
        } catch (expandErr) {
          console.warn('Expand pass failed:', expandErr.message);
          // Fall through — return original draft rather than error
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      res.json({ post, imageIdea });
    } catch (err) {
      console.error('Post generation error:', err.status ?? 500, err.message);
      res.status(500).json({ error: 'Failed to generate post. Please try again.' });
    }
  }
);

export default router;
