// test-hooks.js — Hook quality evaluator
// Usage:
//   node test-hooks.js            — run all 70
//   node test-hooks.js --batch=1  — run tests 1–10
//   node test-hooks.js --batch=2  — run tests 11–20
//   node test-hooks.js --batch=3  — run tests 21–30
//   node test-hooks.js --batch=4  — run tests 31–40
//   node test-hooks.js --batch=5  — run tests 41–50
//   node test-hooks.js --batch=6  — run tests 51–60
//   node test-hooks.js --batch=7  — run tests 61–70
import 'dotenv/config';
import OpenAI from 'openai';

const groq = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
  timeout: 45000,
});

const SERVER  = 'http://localhost:3000';
const API_KEY = process.env.INTERNAL_API_KEY;
const MAX_REGEN = 5;

// Parse --batch=N from argv
const batchArg = process.argv.slice(2).find(a => a.startsWith('--batch='));
const BATCH = batchArg ? parseInt(batchArg.split('=')[1]) : null;

// ── 30 test cases (3 batches of 10) ──────────────────────────────────────────
const ALL_CASES = [

  // ── BATCH 1 (tests 1–10) ─────────────────────────────────────────────────
  {
    name: 'Ananya Krishnan', role: 'Legal and Compliance Manager', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We had a regulatory audit last year that found a documentation gap across 1,200 member records. We had 72 hours to remediate it. I had a team of three people. We cleared it in 68 hours. I did not sleep for two days and neither did my team. The auditors came back the next morning and we passed.' },
      { role: 'assistant', content: 'What was the hardest part of those 68 hours?' },
      { role: 'user', content: 'Prioritising. With 1,200 records we could not fix everything. We had to decide in the first hour which gaps were existential and which were cosmetic. We got that call right. That is the only reason we made it.' },
    ]
  },
  {
    name: 'Vikash Tiwari', role: 'Field Sales Manager', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I was in a meeting with a 600-person manufacturing company last quarter. The HR head was ready to sign. She had her pen out. Then her CFO walked in unannounced, spent four minutes asking about one line item in the proposal, and left without saying anything. The HR head put her pen down. The deal went cold for three months.' },
      { role: 'assistant', content: 'What did you do over those three months?' },
      { role: 'user', content: 'I sent one message a month. Not a pitch. Just something relevant to what the CFO had asked about. On the third month she replied. We closed two weeks later. The CFO never came back into the room. He had already got what he needed from my messages.' },
    ]
  },
  {
    name: 'Kavya Nambiar', role: 'UX Researcher', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We ran a usability test on our claims form last month. Five users. All five failed the same step. The step was labelled "Policy Number." What none of them knew was that Loop has two different policy numbers — the employer one and the individual one. We had assumed users would know which one we meant. Nobody did.' },
      { role: 'assistant', content: 'What changed after that?' },
      { role: 'user', content: 'We renamed the field "Your personal policy number (not the company one)" and added one line of helper text. The drop-off at that step went from 34% to 6%.' },
    ]
  },
  {
    name: 'Ritu Sharma', role: 'Learning and Development Manager', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We launched a mandatory training module on health insurance literacy for all employees. 94% completion in the first week. We were proud of it. Three months later I ran a quick quiz with 20 employees from the cohort. The average score was 38%. They had completed it. They had retained almost nothing.' },
      { role: 'assistant', content: 'What did you change after that?' },
      { role: 'user', content: 'We rebuilt it as five ten-minute modules spaced three weeks apart, each one ending with one real task — look up your own policy number, find your network hospital, submit a dummy claim. Completion dropped to 71% but retention at three months jumped to 82%. The vanity metric had been lying to us.' },
    ]
  },
  {
    name: 'Sanjay Menon', role: 'Infrastructure Engineer', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We had a database migration that was supposed to take four hours. It took eleven. The business logic was fine. The issue was a foreign key constraint we had not mapped correctly in the migration script. We found it at hour six. It had been there in the schema for three years. Nobody had ever run the migration in production before.' },
      { role: 'assistant', content: 'What does that tell you about how you run migrations now?' },
      { role: 'user', content: 'Every migration now runs in a full production clone before it touches real infrastructure. It takes an extra two days. We have not had an unplanned outage since we added that step. The two days is not overhead. It is the actual work.' },
    ]
  },
  {
    name: 'Preethi Balaji', role: 'Growth and Analytics Manager', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We had a referral programme that we thought was not working. The click-through rate was 2%. I pulled the cohort data and found that the people who came through the referral programme had a 60-day retention rate of 74%, versus 41% for all other channels. We had been measuring the wrong thing and about to kill our best acquisition channel.' },
      { role: 'assistant', content: 'What changed after you found that?' },
      { role: 'user', content: 'We doubled the referral budget the following quarter. The retention difference held. We stopped reporting click-through and started reporting 60-day retention by channel.' },
    ]
  },
  {
    name: 'Aryan Mehta', role: 'Product Management Intern', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'In my second week here I pushed a change to the onboarding flow that I was sure would reduce drop-off. I had not talked to any users. I had not checked with the PM. I had just looked at the numbers and decided I understood what was happening. The change increased drop-off by 11%. I spent the next week undoing it and understanding why.' },
      { role: 'assistant', content: 'What did you learn from that?' },
      { role: 'user', content: 'Data tells you what is happening. It never tells you why. I had confused the two. An 11% drop-off increase was an expensive way to learn that.' },
    ]
  },
  {
    name: 'Smita Jha', role: 'Senior Claims Associate', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'A claim came to me that had been rejected three times by the TPA. Each time for a different reason. The member had been trying to get it resolved for four months. When I actually read through the full file I found that the first rejection reason was factually wrong — the procedure was listed as elective but the doctor had clearly coded it as emergency. Everything after that had been built on a mistake.' },
      { role: 'assistant', content: 'What happened when you escalated it?' },
      { role: 'user', content: 'We got the claim cleared in six days. The member got a full reimbursement of 2.3 lakh. She had spent four months believing the system had decided against her. It had not. One wrong code had started a chain nobody had bothered to trace back.' },
    ]
  },
  {
    name: 'Varun Gupta', role: 'Business Development Manager', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I lost a renewal last month that I thought was certain. The HR head had told me two weeks before that they were renewing. Then the company got acquired. The new parent had a group insurance contract already in place. There was nothing to negotiate. The contract we had built over two years was irrelevant in 48 hours.' },
      { role: 'assistant', content: 'What does that make you think about how you build client relationships?' },
      { role: 'user', content: 'I had built the relationship with one person at one company. The acquisition made both of them irrelevant overnight. Now I try to make sure the value we deliver is understood by at least three people at every client, and documented somewhere that survives a personnel change.' },
    ]
  },
  {
    name: 'Leena Thomas', role: 'Chief Operating Officer', length: 'long',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'Last year we had a situation where two of our teams had been solving the same problem independently for six weeks. Claims ops had built one solution. Product had built another. Both were functional. Neither team knew the other existed. When we found out, we had to pick one and shut down six weeks of work by good people who had done nothing wrong.' },
      { role: 'assistant', content: 'What caused it and what changed after?' },
      { role: 'user', content: 'There was no shared problem registry. People were self-organising around problems they had individually identified without any visibility into what others were working on. We built a simple shared doc that every team updates on Mondays with what they are actively solving. That is it. No new tool, no new process. The duplication has not happened again.' },
    ]
  },

  // ── BATCH 2 (tests 11–20) ────────────────────────────────────────────────
  {
    name: 'Dr. Neeraj Kapoor', role: 'Clinical Lead', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'A member called me last year who had been denied a specialist referral three times by his insurer. He had a persistent cough for five months. By the time I got involved and pushed the referral through, the diagnosis came back as early-stage lung cancer. He is in treatment now and doing well. But those three months of denials were three months of delay on a diagnosis that needed to come sooner.' },
      { role: 'assistant', content: 'What does that case mean to you about your work at Loop?' },
      { role: 'user', content: 'Insurance decisions are medical decisions. They always were. The person approving or denying a referral is making a clinical call whether they know it or not. That is why having doctors in the loop — literally — changes outcomes.' },
    ]
  },
  {
    name: 'Shweta Nair', role: 'Head of Brand', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We rebranded last year. Six months of work, a new visual identity, new messaging, new website. We launched it. Within three weeks one of our support executives was on a member call and the member said "I have always thought of Loop as the people who actually pick up the phone." That line was not in any of our brand materials. It was more true than anything we had written.' },
      { role: 'assistant', content: 'What did you do with it?' },
      { role: 'user', content: 'We restructured the entire brand messaging around it. The thing people already believed about us was stronger than anything we had invented. The rebrand had been solving the wrong problem.' },
    ]
  },
  {
    name: 'Karan Singh', role: 'Data Engineering Lead', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We had a pipeline that had been running daily for 18 months with no issues. One Monday morning it failed silently. No alert, no error log, just no data. The dashboard that our ops team used every morning to prioritise their day was showing data from the Friday before. They had been making decisions on stale data for two days before anyone noticed.' },
      { role: 'assistant', content: 'What caused it and what changed after?' },
      { role: 'user', content: 'A schema change upstream had added a nullable column that our type-enforcement layer was rejecting silently. The fix took 40 minutes. The real issue was that silent failure was possible at all. We now have a freshness check on every dashboard — if the data is more than 25 hours old, the dashboard shows a red banner. Obvious in hindsight.' },
    ]
  },
  {
    name: 'Meenakshi Pillai', role: 'HR Business Partner', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I had a manager come to me last year who wanted to let someone go for performance reasons. The person had been on a PIP for two months. When I looked at the case I found that three of the five performance gaps on the PIP had nothing to do with the employee — they were blocked by dependencies on other teams that had not delivered. The employee had been put on a PIP for failing at things she could not control.' },
      { role: 'assistant', content: 'What happened after you flagged that?' },
      { role: 'user', content: 'We closed the PIP, removed the performance flags from her record, and addressed the blocking dependencies separately. She is still at Loop and has since been promoted. It was close to being a very avoidable exit.' },
    ]
  },
  {
    name: 'Suresh Patel', role: 'Co-founder and CEO', length: 'long',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'In our first year we nearly ran out of runway because we had signed contracts we could not operationally deliver. The product was not ready for the volume. We had said yes to every client because we needed the revenue. By month nine we were understaffed, burning cash on manual workarounds, and losing members because the experience was broken. We had to go back to three clients and renegotiate down the scope.' },
      { role: 'assistant', content: 'What is the lesson you carry from that?' },
      { role: 'user', content: 'Revenue that destroys your product is not revenue. It is borrowed time. The hardest skill I have built in the last four years is knowing which contracts to turn down, and having the discipline to actually turn them down when the product is not ready.' },
    ]
  },
  {
    name: 'Aditi Krishnamurthy', role: 'Senior Product Designer', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We designed a new notification system that we were proud of. Clean, clear, well-timed. In user testing, every single person dismissed the notifications immediately without reading them. When we asked why, they all said the same thing: their other apps had trained them to dismiss notifications without reading. It had nothing to do with our design. It was behavioural conditioning from a decade of bad notifications from every other app they used.' },
      { role: 'assistant', content: 'What did you change?' },
      { role: 'user', content: 'We moved critical health alerts out of the notification system entirely and into a persistent card in the app home screen. Read-rate went from 12% to 71%.' },
    ]
  },
  {
    name: 'Rajiv Menon', role: 'Head of Operations', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We had a hospital empanelment process that was taking an average of 94 days from first contact to signed agreement. We had accepted this as normal. Then I mapped the actual process and found that 61 of those 94 days were waiting time — waiting for document submissions, waiting for approvals, waiting for counter-signatures. Only 33 days involved any actual work.' },
      { role: 'assistant', content: 'What did you change?' },
      { role: 'user', content: 'We moved to a parallel processing model where document collection, legal review, and commercial approval happen simultaneously rather than sequentially. Average time is now 38 days. The work did not change. The sequencing did.' },
    ]
  },
  {
    name: 'Fatima Khan', role: 'Member Support Executive', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'A member called me last month who was trying to understand why her maternity claim had been partially settled. She was calm on the call but something in her voice made me stay longer than usual. It turned out she had delivered prematurely and the baby was still in the NICU. She was trying to figure out the insurance because she needed the money to keep paying for the care. She had been doing this while sitting outside the NICU ward.' },
      { role: 'assistant', content: 'What did you do?' },
      { role: 'user', content: 'I escalated it as an emergency, got the remaining amount processed in four hours, and personally called her back to confirm. She did not say anything when I told her. She just cried for about twenty seconds. That call is the reason I am in this work.' },
    ]
  },
  {
    name: 'Amit Sharma', role: 'Enterprise Sales Lead', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I had a 2,000-person enterprise deal that was three months from closing. The HR head had championed it internally, the pricing was agreed, the legal was done. Then the company went through a leadership change. The new CHRO had come from a company that used a competitor. She pulled the entire process back to zero and ran a fresh RFP. We had to re-compete from scratch against a vendor she already trusted.' },
      { role: 'assistant', content: 'What happened and what did you learn?' },
      { role: 'user', content: 'We won the RFP. But what I learned was that a deal is not done until it is done. I now treat every contract as uncertain until the first invoice is paid, and I map every enterprise deal to multiple senior relationships so one leadership change cannot reset three months of work.' },
    ]
  },
  {
    name: 'Divya Agarwal', role: 'Finance and Accounting Lead', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We had a reconciliation discrepancy that showed up every quarter for six quarters in a row. Each quarter the team would find it, trace it to a specific transaction type, fix it manually, and close the books. It was about two lakh every time. Sixth quarter I refused to let us just fix it again. I made the team trace it all the way back. We found a configuration error in how one category of claims was being mapped to our accounting codes. It had been there since we onboarded our first insurer partner.' },
      { role: 'assistant', content: 'What did fixing it properly change?' },
      { role: 'user', content: 'The discrepancy stopped. We also recovered about 11 lakh in miscategorised entries from prior quarters. Six quarters of patching something that needed to be fixed once. The manual fix had been hiding the root cause every time.' },
    ]
  },

  // ── BATCH 3 (tests 21–30) ────────────────────────────────────────────────
  {
    name: 'Neha Sharma', role: 'Customer Experience Head', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We ran a member satisfaction survey and got a 78 NPS. Excellent by most benchmarks. Then I looked at what the detractors were actually saying. All of them mentioned one thing: hold time. Not the outcome of the call, not the quality of the support, just the wait before anyone picked up. Our hold time was 4 minutes 20 seconds on average. Industry average is 7 minutes. We were outperforming the industry and still losing members over it.' },
      { role: 'assistant', content: 'What did you change?' },
      { role: 'user', content: 'We added a callback option and moved to a tiered routing system for complex claims. Average hold time dropped to 1 minute 50 seconds. NPS moved to 89 in the next survey. The gap between 78 and 89 was one minute and thirty seconds of wait time.' },
    ]
  },
  {
    name: 'Pradeep Rao', role: 'Full Stack Engineer', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I refactored our authentication service last quarter. It had been written in a hurry during an early sprint and nobody had touched it since. The original developer had left. There were no tests. There were three different session management approaches running simultaneously in the same codebase because each one had been added to patch a bug in the previous one.' },
      { role: 'assistant', content: 'What happened when you refactored it?' },
      { role: 'user', content: 'The refactor took two weeks. The new version was 40% fewer lines, had full test coverage, and fixed two security vulnerabilities we had not known existed. The old code had been hiding its own bugs inside its own complexity. You cannot see what is wrong with code you cannot understand.' },
    ]
  },
  {
    name: 'Sahana Murthy', role: 'Content Strategist', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We created a health insurance explainer series — ten articles, each one explaining a concept most employees do not understand. Waiting periods, sub-limits, TPA processes. We spent three months on it. Total organic traffic in six months: 800 views. Then one of our support executives posted a 200-word LinkedIn post explaining why most employees do not realise their policy has a room rent sub-limit. It got 60,000 impressions in four days.' },
      { role: 'assistant', content: 'What is the lesson from that?' },
      { role: 'user', content: 'The article answered a question. The post started with the moment the person realised they had been wrong about something. One of those formats creates curiosity. The other delivers information.' },
    ]
  },
  {
    name: 'Manish Gupta', role: 'Hospital Partnerships Lead', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I had a hospital director tell me last year that we were the easiest insurer she worked with to get cashless authorisations from. She said her billing team had a nickname for us — the "yes desk." I thought that was a compliment. Then she said: "but your competitors are faster on pre-auth for elective procedures." The compliment had a catch.' },
      { role: 'assistant', content: 'What did you take from that?' },
      { role: 'user', content: 'Being easy to work with is not enough if you are slow on the things that hospitals actually time. We mapped the authorisation types where we were being compared to faster competitors and built a dedicated fast-track for those specific categories. The "yes desk" became faster on the calls that mattered most to her team.' },
    ]
  },
  {
    name: 'Swathi Reddy', role: 'People Operations Lead', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We introduced flexible working hours last year. Within two months, 80% of the team had shifted to non-standard hours. Productivity metrics went up. Then I noticed something in the collaboration data: async response times between some teams had stretched from 2 hours to 11 hours. The flexibility had created invisible gaps in the workday where nobody was available at the same time.' },
      { role: 'assistant', content: 'How did you fix it?' },
      { role: 'user', content: 'We introduced a 4-hour daily overlap window — everyone had to be available between 11am and 3pm. Everything else was flexible. The async gaps closed. The productivity improvement held. Flexibility needs a shared anchor or it fragments the team.' },
    ]
  },
  {
    name: 'Rahul Jain', role: 'Sales Development Representative', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'My first month in sales I made 200 cold calls. Booked 3 meetings. My second month I made 80 calls. Booked 11 meetings. The difference was that I spent the first month calling everyone on a list. The second month I spent two hours researching each company before calling, and only called the ones where I had a specific reason to believe they had a problem we could solve. Fewer calls, more conversations.' },
      { role: 'assistant', content: 'What did that change in how you think about prospecting?' },
      { role: 'user', content: 'Volume is not the metric. The right call to the right person at the right moment is the metric. 200 wrong calls are just 200 hang-ups.' },
    ]
  },
  {
    name: 'Karishma Patel', role: 'UX Lead', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We redesigned our claims submission flow last year. We made it cleaner, shorter, more intuitive. Tested it with 12 users before launch — 11 of 12 completed without any help. We launched. Drop-off at the final submission step went from 8% to 22%. We had no idea why. The testing had not caught it.' },
      { role: 'assistant', content: 'What had gone wrong?' },
      { role: 'user', content: 'The test users were Loop employees and their close contacts. All of them had moderate smartphone literacy. The final submission step required uploading a document. In real-world usage, most members were doing this from basic Android phones with unreliable storage access. The upload button was technically identical but functionally broken for a significant portion of our actual user base. We had tested with the wrong people.' },
    ]
  },
  {
    name: 'Vijay Krishnan', role: 'DevOps Engineer', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We had an incident last year where a deploy went to production at 6pm on a Friday. It introduced a latency spike in our member portal. Support started getting calls at 7pm. By 8pm we had rolled back but 900 members had hit errors trying to check their policy status during that hour. The deploy had passed all automated checks. The latency issue only appeared under real production load patterns.' },
      { role: 'assistant', content: 'What changed in how you deploy after that?' },
      { role: 'user', content: 'No deploys after 4pm on Fridays. No exceptions. We also added a canary stage that routes 5% of real production traffic before a full rollout. The Friday rule is not glamorous. It has prevented three near-incidents since we introduced it.' },
    ]
  },
  {
    name: 'Roshni Thomas', role: 'Senior Member Advocate', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I had a member call me last year who had been through a cancer diagnosis and treatment over the previous nine months. He called to say thank you before his policy came up for renewal. He mentioned fourteen separate interactions he had with us over those nine months — fourteen calls, claims, approvals, escalations. He had kept track of every single one. He said the thing that had mattered most was that we had never made him explain his situation again from the beginning on a new call.' },
      { role: 'assistant', content: 'What does that mean for how you approach your work?' },
      { role: 'user', content: 'Every time a member has to re-explain why they are calling, we are telling them their history does not matter to us. He had fourteen calls over nine months and never once had to start from scratch. That is not a feature. That is a decision somebody made about how to build the system, and it mattered to a person going through the hardest year of his life.' },
    ]
  },
  {
    name: 'Tarun Mehta', role: 'VP of Product', length: 'long',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'Three years ago we killed a feature that 8% of our members used every month but that had cost us disproportionate engineering time to maintain. Our reasoning was sound — low usage, high cost, bad ROI. Six months after we removed it, churn in that 8% cohort was 3x higher than our overall churn rate. We had not understood that those 8% were the members with the most complex health needs, and that feature was the reason they had stayed.' },
      { role: 'assistant', content: 'What changed in how your team makes removal decisions now?' },
      { role: 'user', content: 'We do not deprecate any feature based on usage volume alone. We now segment the users of every low-usage feature by member health complexity before making any removal decision. Usage rate is the wrong metric for features that serve the most vulnerable members. Low usage does not mean low importance. It means fewer people needed it — which is exactly why it mattered to the ones who did.' },
    ]
  },

  // ── BATCH 4 (tests 31–40) ────────────────────────────────────────────────
  {
    name: 'Aisha Desai', role: 'Member Onboarding Specialist', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We tracked first-time activation for new members across 2023. On average, members activated their Loop account 18 days after their employer sent the invite. In that 18-day gap, three members filed claims they could not process because they had not activated yet. We looked at what was delaying activation. The top reason: they did not know what "activate" meant or why they needed to do it.' },
      { role: 'assistant', content: 'What changed when you fixed the messaging?' },
      { role: 'user', content: 'We rewrote the invite email to say "Your health insurance is ready — here is how to use it" instead of "Activate your account." Median activation dropped from 18 days to 3. Three words on a button had been sitting between members and their own insurance for 15 days.' },
    ]
  },
  {
    name: 'Nikhil Rao', role: 'Machine Learning Engineer', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We built a model to flag potentially fraudulent claims before review. It performed beautifully in testing — 91% precision. We deployed it. Within a month our clinical team flagged that it was disproportionately rejecting claims from a particular region. When we investigated, we found the training data was skewed: that region had historically had more manually reviewed claims, which meant more rejections in the data, which the model learned as a signal for fraud.' },
      { role: 'assistant', content: 'What did that teach you about how you validate models?' },
      { role: 'user', content: 'A model that learns from biased decisions reproduces those decisions at scale and calls them objective. We now audit every model output by region, claim type, and member demographic before any deployment. Precision on a test set is the beginning of evaluation, not the end.' },
    ]
  },
  {
    name: 'Priya Sundaram', role: 'Key Account Manager', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'My largest client — 3,400 employees — nearly churned last year. Not because of price. Not because of service quality. Their new HR director had not been part of the original buying decision and had no context for why they had chosen Loop. She had inherited the contract. In her first three months she received five calls from employees with unresolved issues, all minor, all fixable. Each one confirmed her existing doubt.' },
      { role: 'assistant', content: 'How did you save the account?' },
      { role: 'user', content: 'I asked for a 90-minute session with her — not a pitch, just a walkthrough of what we had built for her company since day one. Claims processed, escalations resolved, cost saved per member. She had not seen any of that. The account was at risk because nobody had ever shown her what she had already bought. We renewed. I now do a quarterly business review with every new HR director from week one.' },
    ]
  },
  {
    name: 'Deepak Malhotra', role: 'Actuarial Analyst', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We were pricing a renewal for a 1,200-person tech company. My model came back with a 22% premium increase. The client pushed back hard. Their broker told them the market rate was 11%. I spent two days defending the number before someone asked me to break down the claims driving it. When I did, I found that 70% of the increase was driven by six members with chronic conditions that had not been disclosed at onboarding.' },
      { role: 'assistant', content: 'What happened after that?' },
      { role: 'user', content: 'We separated the six high-cost members and priced them differently. The base renewal came down to 13% for the remaining 1,194 members. The model had been correct. The number had been applied wrong. A 22% headline had almost cost us the client.' },
    ]
  },
  {
    name: 'Tanvi Bhat', role: 'Wellness Programme Manager', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We ran a corporate wellness programme across 14 clients last year. Average participation: 12%. We had webinars, fitness challenges, mental health resources. Everything the industry recommends. Then one client — a 200-person logistics company — hit 68% participation. Same programme, same content. I called their HR head to ask what they had done differently. She said: their CEO had joined every session and brought his direct reports.' },
      { role: 'assistant', content: 'What does that tell you about wellness programme design?' },
      { role: 'user', content: 'Participation in wellness follows leadership. A programme no executive is seen doing is a programme employees understand is optional. The content was never the problem.' },
    ]
  },
  {
    name: 'Siddharth Ghosh', role: 'Platform Engineer', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We had a microservice that had been in production for two years with a known memory leak. Every engineer who looked at it had added it to their backlog. It never moved up. The leak was slow — the service restarted itself every 72 hours automatically, which masked the problem. Then we added load balancing and the restart cycle broke. We had an outage for four hours on a Tuesday morning that affected 11,000 members trying to check claim status.' },
      { role: 'assistant', content: 'What changed in how you manage technical debt after that?' },
      { role: 'user', content: 'Automatic workarounds are not fixes. They are scheduled time bombs. We now have a rule: if a service requires a scheduled restart to stay healthy, it is a P1 debt item. We fixed the leak in six hours once it was actually prioritised. It had been in someone\'s backlog for 24 months.' },
    ]
  },
  {
    name: 'Anita Varghese', role: 'Legal Counsel', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'A member escalated a dispute to the IRDAI last year over a denied claim. The denial had been legitimate — the procedure was explicitly excluded in the policy. But when I reviewed the denial letter, I found that it had cited the wrong clause number. The reasoning was correct but the reference was wrong. The regulator flagged it as a procedural deficiency and required us to reopen the case.' },
      { role: 'assistant', content: 'What came of the reopened case?' },
      { role: 'user', content: 'After a proper review the denial stood, but the process had cost us six weeks, two hearings, and significant goodwill with the member. A correct decision with a wrong citation is still a deficient decision. We now have a two-person sign-off on every denial letter before it goes out.' },
    ]
  },
  {
    name: 'Rohit Pillai', role: 'Inside Sales Executive', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I called a 150-person startup six times over four months. No response. On the seventh call the founder picked up and said she had been meaning to call us back since the first one. She had seen our case study on a competitor exit and had been following us since. She signed a two-year contract on that call. Six unanswered calls had not been rejection. They had been timing.' },
      { role: 'assistant', content: 'What does that change about how you think about silence from prospects?' },
      { role: 'user', content: 'No reply is not no. It is just not yet. The discipline is knowing the difference between someone who has decided against you and someone who has not decided yet. I now treat silence as a reason to stay present, not to stop.' },
    ]
  },
  {
    name: 'Kavitha Nair', role: 'Claims Quality Analyst', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I audited 200 rejected claims last quarter looking for patterns. Found that 31 of them — 15.5% — had been rejected for "incomplete documentation" when the documentation was actually present in the system. The claims had been processed using an older checklist that predated a TPA requirement change. The TPA had updated their requirements nine months earlier. Nobody had updated our checklist.' },
      { role: 'assistant', content: 'What did fixing that look like?' },
      { role: 'user', content: 'We reprocessed all 31 claims. 28 were approved. Members recovered a combined 14.6 lakh. The checklist now has a quarterly review owner. A nine-month-old document had been silently wronging members every week.' },
    ]
  },
  {
    name: 'Arjun Krishnaswamy', role: 'Strategic Partnerships Lead', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I spent seven months building a partnership with a diagnostics chain that would have given our members same-day lab results and 30% discounted rates across 180 cities. The commercial terms were agreed. The integration was scoped. Two weeks before signing, their board approved an acquisition by a larger hospital group. The new parent had an exclusivity clause with a competing insurer. Seven months ended in two weeks.' },
      { role: 'assistant', content: 'How do you approach partnership timelines differently now?' },
      { role: 'user', content: 'Before I invest more than two months in any partnership, I now do a corporate structure check — ownership, pending acquisitions, exclusivity clauses in their existing contracts. Seven months is too long to wait to find out a deal was structurally impossible.' },
    ]
  },

  // ── BATCH 5 (tests 41–50) ────────────────────────────────────────────────
  {
    name: 'Lakshmi Iyer', role: 'Data Analyst', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'Our mental health utilisation data showed that 9% of members used at least one mental health session per year. We thought that was a strong number. Then I cut it by employer size. Companies under 200 employees: 3%. Companies over 1,000 employees: 17%. Same benefit, same app, five times the difference in usage. The gap was entirely explained by whether the employer had publicly normalised using it.' },
      { role: 'assistant', content: 'What did you recommend after finding that?' },
      { role: 'user', content: 'We built a playbook for HR leads in smaller companies — how to talk about mental health benefits without it feeling performative. Utilisation in the under-200 cohort is up to 8% in the six months since. One number had hidden five completely different realities.' },
    ]
  },
  {
    name: 'Sudhir Bose', role: 'Senior Network Engineer', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We had a hospital in our network that had been generating complaints for eight months. Billing disputes, long wait times for cashless approvals, rude front desk staff. We had logged 23 complaints against them. Each one had been resolved individually. Nobody had looked at them as a pattern. I pulled them all together and took them to the hospital administration as a single report. The general manager said it was the first time any insurer had done that.' },
      { role: 'assistant', content: 'What happened after you brought the pattern to them?' },
      { role: 'user', content: 'They assigned a dedicated liaison for Loop members and restructured their cashless approval desk. Complaints against that hospital dropped from 23 in eight months to 2 in the following six. The fix had existed inside the problem the whole time. It just needed someone to connect the dots.' },
    ]
  },
  {
    name: 'Megha Kulkarni', role: 'Product Operations Manager', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We shipped a feature that let members track their claim status in real time. After launch, support call volume went up by 18% instead of down. We expected fewer calls because members could now see the status themselves. What we had not anticipated was that seeing "under review — day 4" without any explanation of what that meant generated more anxiety than not knowing the status at all.' },
      { role: 'assistant', content: 'What did you change?' },
      { role: 'user', content: 'We added plain-language explanations to every status state — what it means, what happens next, and the typical timeline. Support volume dropped 31% from its pre-feature baseline. The feature had been correct. The context around it was the product.' },
    ]
  },
  {
    name: 'Harish Venkataraman', role: 'Reinsurance Manager', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We restructured our reinsurance arrangement last year after a catastrophic claims quarter — a single large corporate client had three employees with organ transplants in the same quarter. The total claims from those three members exceeded our reinsurance attachment point for the first time in three years. We had been underpricing our catastrophic risk because we had designed our models around average claim years.' },
      { role: 'assistant', content: 'What does that change about how you think about risk modelling?' },
      { role: 'user', content: 'Average years do not protect you from bad years. We restructured the attachment point calculation to account for tail risk in small cohorts — specifically, groups under 500 where a single high-cost member can move the entire loss ratio. The model now prices for the year that can happen, not the year that usually happens.' },
    ]
  },
  {
    name: 'Pooja Agarwal', role: 'Employee Relations Manager', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'A manager came to me with a team member she described as "disengaged and checked out." She wanted to start a performance process. Before I opened any documentation I asked her one question: when was the last time she had a one-on-one with this person that was not about a deliverable? She thought about it and said she could not remember. That was the whole conversation.' },
      { role: 'assistant', content: 'What happened after that?' },
      { role: 'user', content: 'They started weekly one-on-ones. Six weeks later the manager came back and said the team member was one of her best performers. Nothing about the role had changed. The relationship had. Performance problems are often management problems in disguise.' },
    ]
  },
  {
    name: 'Vivek Anand', role: 'Cloud Infrastructure Lead', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'Our cloud costs went up 40% year over year. Leadership wanted to know why. When I audited our usage I found that 34% of our compute spend was on resources that had been provisioned for specific projects, those projects had shipped, and nobody had deprovisioned the resources. They were running idle. It had been happening for 18 months.' },
      { role: 'assistant', content: 'What did you put in place after that?' },
      { role: 'user', content: 'Every provisioned resource now has a mandatory owner tag and a 90-day review flag. If a resource has no associated active project for 90 days it gets a deprecation notice and is deprovisioned in 14 days unless someone claims it. Cloud costs dropped 28% in the quarter we implemented it. 34% of our compute budget had been a graveyard.' },
    ]
  },
  {
    name: 'Preeti Choudhury', role: 'Head of Customer Success', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We tracked which clients renewed and which churned over 18 months and looked for early signals. The strongest predictor of churn was not NPS. It was not support ticket volume. It was whether the HR head who had signed the contract was still at the company 12 months later. In 78% of our churned accounts, the original buyer had left. In only 22% of renewals had the original buyer left.' },
      { role: 'assistant', content: 'What did you change in your success model based on that?' },
      { role: 'user', content: 'We now do a structured "relationship expansion" push in the first 90 days of every contract — mapping Loop\'s value to at least three people at the client beyond the original buyer. The person who bought is the most vulnerable link. When they leave, the contract leaves with them unless someone else owns the relationship.' },
    ]
  },
  {
    name: 'Vikram Nambiar', role: 'Mobile App Developer', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We pushed an app update that reduced our average screen load time from 3.2 seconds to 1.1 seconds. We expected member satisfaction scores to go up. They did not move. We were confused. Then we looked at what members were doing differently: session length went up 23%, feature discovery went up 41%, and support calls about "app not working" dropped 60%. The satisfaction score had not moved because members do not notice speed — they only notice slowness.' },
      { role: 'assistant', content: 'What does that tell you about how to measure your work?' },
      { role: 'user', content: 'Absence of friction is invisible. The right metric for a performance improvement is not satisfaction — it is behaviour. Members showed us the 1.1-second experience was better by doing more, not by saying so.' },
    ]
  },
  {
    name: 'Shilpa Menon', role: 'Clinical Partnerships Manager', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We partnered with a mental health platform last year. The agreement gave Loop members access to 12 free therapy sessions per year. Utilisation in the first six months: 4%. We started looking at the drop-off funnel. 61% of members who clicked the benefit page left without booking. The most common exit point was the therapist selection screen — 47 therapists listed, no filters, no context.' },
      { role: 'assistant', content: 'What happened when you fixed the selection experience?' },
      { role: 'user', content: 'We added three filters — language, specialisation, and availability within 48 hours — and reduced the default view to 8 therapists with short bios. Booking conversion went from 39% to 74%. The barrier to mental health support had been a dropdown menu.' },
    ]
  },
  {
    name: 'Gaurav Tiwari', role: 'Sales Operations Analyst', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I cleaned our CRM data last quarter. Of 4,200 leads in our active pipeline, 1,100 had no activity logged in the past six months. Not one call, not one email, not one note. They were in "active pipeline" in name only. The team had been reporting pipeline value that did not exist. When I removed the dead leads our coverage ratio fell from 3.4x to 1.9x — below what we needed to hit our targets.' },
      { role: 'assistant', content: 'What did the team do once the number was honest?' },
      { role: 'user', content: 'It was uncomfortable. Nobody likes finding out their pipeline is half the size they thought. But it was the first time in a year we had an accurate number to work from. You cannot close deals that exist only in a spreadsheet.' },
    ]
  },

  // ── BATCH 6 (tests 51–60) ────────────────────────────────────────────────
  {
    name: 'Rohan Mathur', role: 'Backend Engineer', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We had an API endpoint that was returning incorrect data for about 0.3% of requests. The error rate was so low it stayed below our alerting threshold. We found it because a member called support to say their policy end date was showing as 1970. A Unix epoch bug — somewhere in the stack a timestamp was being read as zero and converted to the epoch. It had been in production for eleven weeks.' },
      { role: 'assistant', content: 'What changed in how you handle low-frequency bugs?' },
      { role: 'user', content: 'Low rate does not mean low impact. 0.3% of our requests is still hundreds of members per day seeing wrong data. We lowered our alerting thresholds and added anomaly detection on data values, not just error codes. A bug that affects few people but affects them badly is still a P1.' },
    ]
  },
  {
    name: 'Namrata Singh', role: 'Head of Communications', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'A large tech client lost 900 employees in a single layoff round last year. We had 72 hours notice before it went public. My job was to communicate to those 900 members that their health insurance coverage was ending and what their options were — without being the thing that made the worst week of their lives worse. I have written a lot of communications in this job. That one took me longer than anything else.' },
      { role: 'assistant', content: 'What did you learn from writing that?' },
      { role: 'user', content: 'Every word in that message was a decision about what we owed those people. We owed them clarity, speed, and the sense that we had thought about them as people. The hardest part of crisis communication is not the message — it is making sure the message was worth writing.' },
    ]
  },
  {
    name: 'Ajay Kapoor', role: 'Compliance Officer', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We went through our first IRDAI examination last year. They reviewed 18 months of operations, claims decisions, policy documentation, and member communications. We passed. But during the review I found something I had not known: two of our policy wordings had clauses that contradicted each other when applied to pre-existing conditions. They had been there since the policies were drafted. No complaint had ever surfaced from them — but they were a liability waiting to be triggered.' },
      { role: 'assistant', content: 'What did that reveal about your review process?' },
      { role: 'user', content: 'We had reviewed the policies at the clause level but never stress-tested them against each other in scenario-based conflicts. A document that is internally consistent can still be contradictory in practice. We now run scenario testing on every policy document before it goes live.' },
    ]
  },
  {
    name: 'Pallavi Krishnan', role: 'Benefits Consultant', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'A client asked me last year why their employees were not using the OPD benefit we had designed for them. It was generous — 5,000 rupees per year for outpatient expenses, no copay. Usage was 8%. I surveyed 50 employees. Every single one knew the benefit existed. None of them knew how to claim it. The onboarding email had explained the benefit but not the claim process. Two completely separate communications had been sent. Neither one had linked to the other.' },
      { role: 'assistant', content: 'What changed after you identified that?' },
      { role: 'user', content: 'We redesigned the OPD onboarding into a single three-step email: what you get, how to claim it, where to submit. Usage went from 8% to 34% in 90 days. The benefit was good. Nobody had told the employees how to use it.' },
    ]
  },
  {
    name: 'Kiran Reddy', role: 'QA Lead', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I found a bug in prod last year that had passed through 4 rounds of QA. It was a rounding error in premium calculations — off by one rupee in certain edge cases. It had been there for five months. 2,400 members had been charged one rupee more than they should have. The total was 2,400 rupees. We refunded every one. The discovery cost more than the refund, which was exactly the right call.' },
      { role: 'assistant', content: 'What made it hard to catch in testing?' },
      { role: 'user', content: 'It only appeared when a policy had a specific combination of add-ons and a mid-cycle amendment. Our test cases had not covered that combination because we had designed them around the common paths. Rare edge cases carry more risk than rare traffic because they are the ones testing misses.' },
    ]
  },
  {
    name: 'Santosh Nair', role: 'CTO', length: 'long',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'Three years ago I made the call to build our core claims processing engine in-house instead of buying an off-the-shelf TPA system. Every advisor told me it was the wrong call. Too expensive, too slow, too risky. We were 80 people at the time. It took 14 months and two rebuilds. There were three moments where I genuinely thought we had made a catastrophic mistake. It is now the thing that makes everything else we do possible.' },
      { role: 'assistant', content: 'What would have happened if you had taken the off-the-shelf path?' },
      { role: 'user', content: 'We would have had something working in 4 months instead of 14. And we would have been constrained by someone else\'s model of how insurance should work for the next decade. The off-the-shelf system would have been faster. It also would have made everything distinctive about what we do either impossible or dependent on a vendor we could not control. The right call is not always the fast one.' },
    ]
  },
  {
    name: 'Meera Joshi', role: 'Policy Servicing Executive', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'A member called last year who had been trying to add a newborn to their policy for three weeks. She had submitted the documents twice. Both times they had been rejected for a format issue she had not been told about. The third time she called she was not angry. She was exhausted. She said she just wanted to know what the actual requirement was so she could do it once and not call again.' },
      { role: 'assistant', content: 'What did you do and what did it change?' },
      { role: 'user', content: 'I stayed on the call, walked her through the exact document format live, confirmed receipt before hanging up. Processing completed in 48 hours. She left a review that mentioned my name. The policy wording for newborn additions now has a checklist in plain language. Her exhaustion rewrote a document.' },
    ]
  },
  {
    name: 'Ravi Shankar', role: 'Employer Relations Manager', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We do annual employer health reviews — a summary of how their workforce used their insurance over the year. Most clients say thank you and file it. One client — a 700-person manufacturing company — used theirs to change their entire occupational health programme. The report had shown a spike in musculoskeletal claims from their floor workers. They introduced ergonomic workstation changes and physiotherapy access. Next year\'s report showed a 40% drop in those claims.' },
      { role: 'assistant', content: 'What does that tell you about what data can do?' },
      { role: 'user', content: 'Claims data is not just a financial record. It is a health map of a workforce. The employer who acts on it is the one whose employees get healthier, whose costs go down, and who renews without negotiating on price. The data was the same for every client. One of them chose to do something with it.' },
    ]
  },
  {
    name: 'Nandita Rao', role: 'UX Writer', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We ran a readability audit on our policy documents last year. Average Flesch-Kincaid grade level: 18.3. A PhD-level reading requirement on documents members need to understand in a hospital corridor at 2am. We rewrote the most-referenced sections — the exclusions list and the claim procedure — in plain language. Average grade level dropped to 8.4. The legal team approved both versions. The only thing that changed was the sentence structure.' },
      { role: 'assistant', content: 'What did that change for members?' },
      { role: 'user', content: 'We do not have before-and-after metrics because we did not measure the right thing before. What I know is that after the rewrite, support calls about what was and was not covered dropped 22%. Clarity is a product feature. Most companies treat it as a legal function.' },
    ]
  },
  {
    name: 'Ashwin Prasad', role: 'Revenue Operations Lead', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I built our first proper revenue attribution model last year. Before that, every deal was credited to whoever closed it. When I ran the model backwards across 18 months of deals, I found that 62% of our closed business had touched at least three different people before close — an SDR who prospected it, an AE who ran the process, and a CSM who had handled an existing client at the same company. None of the SDRs or CSMs had ever been credited.' },
      { role: 'assistant', content: 'What changed in how you measure the team after that?' },
      { role: 'user', content: 'We moved to a shared-attribution model. Quota is still individual but recognition and bonus factor in multi-touch contribution. The SDR who prospected a deal that closed 9 months later now knows they were part of it. The behaviour changed immediately: SDRs started doing more research, CSMs started making more introductions. The model had been measuring one person per deal. Deals are never one person.' },
    ]
  },

  // ── BATCH 7 (tests 61–70) ────────────────────────────────────────────────
  {
    name: 'Shalini Dubey', role: 'Head of Learning', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We onboarded 120 new hires last year across four quarters. First-quarter cohort — 30 people — had a 6-month retention rate of 83%. Fourth-quarter cohort — also 30 people — had a 6-month retention rate of 51%. Same company, same roles, same pay. When I went back and looked at what was different I found that the first cohort had a buddy programme. We had quietly dropped it by Q4 because the coordinators were overloaded.' },
      { role: 'assistant', content: 'What did you do after finding that?' },
      { role: 'user', content: 'We reinstated the buddy programme with a lighter structure — two structured check-ins instead of weekly meetings. First-quarter and fourth-quarter gap closed to within 7 points in the next cohort cycle. A 32-point retention difference had come down to one deprioritised programme. The cost of dropping it was invisible at the time and enormous six months later.' },
    ]
  },
  {
    name: 'Pranav Desai', role: 'API Integration Engineer', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We integrated with our seventh TPA last year. Each integration had been built slightly differently because each TPA had a slightly different API. By the seventh one we had seven separate codebases doing nearly identical things. Maintenance cost was compounding every quarter. I proposed building an abstraction layer — a single internal API that every TPA integration plugs into. The team pushed back because it would delay the seventh integration by three weeks. I made the case and lost.' },
      { role: 'assistant', content: 'What happened after the seventh integration shipped?' },
      { role: 'user', content: 'An eighth TPA came six months later. The team built the abstraction layer first. It took two months for the layer and two weeks for the integration. The seven-TPA approach would have taken eight months. Sometimes losing the argument and waiting for the evidence is the only way to actually win it.' },
    ]
  },
  {
    name: 'Divya Krishnan', role: 'Head of Finance', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We were planning a fundraising round last year. In our data room prep I found three revenue recognition errors going back 18 months — policies that had been counted as ARR at signing rather than at first premium payment. The total overstatement was about 4.2 crore. It was not fraud. It was an accounting policy inconsistency that nobody had caught because the numbers were directionally right and growing fast.' },
      { role: 'assistant', content: 'What did you do?' },
      { role: 'user', content: 'We restated the numbers before sharing the data room. I told the CEO before I told anyone else. It was an uncomfortable conversation. The round still closed — investors respected that we had found and disclosed it ourselves. A self-discovered restatement is a sign of financial maturity. A discovered-by-investors restatement is a sign of something else entirely.' },
    ]
  },
  {
    name: 'Manohar Iyengar', role: 'Customer Education Lead', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We run health insurance literacy workshops for new member cohorts. For the first year we ran them as 60-minute Zoom sessions. Average attendance: 22%. Average completion: 14%. We switched to 12-minute async videos with a WhatsApp-based Q&A follow-up. Completion jumped to 67%. Attendance had been the wrong metric. The format had been the wrong assumption. Health literacy does not need a scheduled hour — it needs to fit into the ten minutes someone has.' },
      { role: 'assistant', content: 'What does that change about how you design programmes going forward?' },
      { role: 'user', content: 'Format is a product decision, not a logistical one. When we design a programme now we start by asking when and where a member will actually engage with it, not what content we want to deliver. The content rarely changes. The container almost always does.' },
    ]
  },
  {
    name: 'Sunita Sharma', role: 'Head of Member Experience', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We added a post-call satisfaction survey last year. 1-to-5 rating, one open-text box. After three months we had 14,000 responses. I read every open-text comment from members who gave us a 3 — the middle score. They were more useful than any other cohort. The 5s told us what they liked. The 1s told us what had gone wrong. The 3s told us what we had almost got right but had missed by one decision.' },
      { role: 'assistant', content: 'What patterns did you find in the 3s?' },
      { role: 'user', content: 'The most common pattern: the issue was resolved but the member had to call back to confirm it. Resolution without confirmation is half a resolution. We added a 48-hour follow-up call for any claim-related support interaction. 3-scores in that category moved to 4.6 in 90 days. The 3s told us exactly what to build.' },
    ]
  },
  {
    name: 'Abhishek Gupta', role: 'Pricing Analyst', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'I was asked to build a pricing model for a new product segment — SMBs under 50 employees. Every insurer in the market charges SMBs a flat loading above the standard rate because the data is thin and the risk feels higher. I built a model using two years of our own SMB claims data. The result was surprising: our sub-50 cohort had a lower loss ratio than our 200-500 cohort, not higher. We had been pricing on market assumption, not our own data.' },
      { role: 'assistant', content: 'What happened when you priced off your own data?' },
      { role: 'user', content: 'We launched an SMB product at 11% below market. It became our fastest-growing segment in two quarters. The market had been overcharging SMBs based on an industry assumption our own data did not support. We had been doing the same thing until someone actually looked.' },
    ]
  },
  {
    name: 'Rashmi Varma', role: 'Data Privacy Officer', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We did a DPDP compliance audit last year in preparation for the new data protection law. In mapping our data flows I found that health data from 14,000 members was being processed by a third-party analytics vendor under a contract that predated DPDP and had no data processing agreement attached. The vendor had been processing sensitive health information for 11 months without a legally valid basis.' },
      { role: 'assistant', content: 'What did you do to fix it?' },
      { role: 'user', content: 'We paused the data feed, executed a retrospective DPA, and rebuilt the contract with explicit health data processing clauses. The vendor was cooperative. The gap had not been negligence — it had been speed. The contract had been signed fast and the DPA template had not existed yet. Compliance debt accrues the same way technical debt does: quietly, and until something forces you to look.' },
    ]
  },
  {
    name: 'Supriya Nath', role: 'Client Renewal Manager', length: 'short',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'A client with 400 employees told me in October that they were going to market for their January renewal. They had been with us for two years. I asked them what was driving it. They said they wanted to benchmark the price. I pulled two years of claims data and showed them that their actual cost per member was 17% below what they would pay at the market benchmark they had quoted me. They had been about to run a process to find out they already had the best deal.' },
      { role: 'assistant', content: 'What does that tell you about renewal conversations?' },
      { role: 'user', content: 'Most clients who go to market do it because they do not know the value of what they have. My job is to tell that story before they start looking. If they already knew, they would not be going to market.' },
    ]
  },
  {
    name: 'Deepa Venkatesh', role: 'Clinical Ops Manager', length: 'medium',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'We had a member who had been hospitalised three times in eight months for the same condition — acute asthma. Each admission was handled as a separate episode. Nobody had looked at the pattern. On the fourth admission our clinical team flagged it. When we reviewed her records we found she had been prescribed the same short-acting reliever each time but had never been offered a long-term controller inhaler. Each discharge had treated the crisis. None had addressed the cause.' },
      { role: 'assistant', content: 'What changed for her and what changed for how you operate?' },
      { role: 'user', content: 'We connected her to a pulmonologist through our network and got her on a proper management plan. She has not been hospitalised since — 14 months. We now flag any member with two or more hospitalisations for the same condition in 12 months for a clinical case review. Episode-based care misses the story that connects the episodes.' },
    ]
  },
  {
    name: 'Vaibhav Khanna', role: 'Head of Sales', length: 'long',
    messages: [
      { role: 'assistant', content: 'What story do you want to tell?' },
      { role: 'user', content: 'In our second year I hired eight sales people in six months because we needed to scale fast. Five of them did not work out. Not because they could not sell — three of them were excellent salespeople. They failed because I had hired for skill and not for the specific motion our product requires. Selling health insurance to a 200-person company\'s HR head is fundamentally different from selling SaaS. The consultative depth, the regulatory knowledge, the clinical vocabulary — I had not designed for any of that in hiring.' },
      { role: 'assistant', content: 'What changed about how you build the sales team now?' },
      { role: 'user', content: 'We built a hiring profile specific to our motion — not "good salesperson" but "person who can hold a credible conversation with a CFO about claims loss ratios." That is a narrow profile. It takes longer to hire. We have not had an early attrition in the sales team since we adopted it. The five who did not work out were not bad hires. They were right people in the wrong seat, which is a hiring problem, not a people problem.' },
    ]
  },
];

// Select cases for this run
const TOTAL_BATCHES = 7;
const START = BATCH ? (BATCH - 1) * 10 : 0;
const END   = BATCH ? BATCH * 10 : ALL_CASES.length;
const TEST_CASES = ALL_CASES.slice(START, END);

// ── Social media specialist evaluator ────────────────────────────────────────
function extractHook(post) {
  const firstBlank = post.indexOf('\n\n');
  return firstBlank >= 0 ? post.slice(0, firstBlank).trim() : post.split('\n').slice(0, 2).join('\n').trim();
}

async function evaluateHook(hook) {
  // Hard JS gate — LLMs cannot count words reliably
  const wc = hook.replace(/\n/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  if (wc > 25) {
    return { pass: false, reason: `Hook is ${wc} words — hard limit is 25.`, raw: `FAIL: ${wc} words` };
  }

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    max_tokens: 80,
    temperature: 0.0,
    messages: [{
      role: 'user',
      content: `You are a senior LinkedIn growth specialist who has grown 50+ accounts to 100k+ followers. Evaluate ONLY this hook (first 2 lines of a LinkedIn post) against these 4 criteria:

1. SCROLL-STOP: A busy professional scrolling their feed would stop and click "see more". Genuine tension, surprise, or curiosity — not just a nice sentence.
2. TWO LINES: Exactly 2 lines, each one complete sentence with a finite verb.
3. SPECIFICITY: At least one concrete detail — a number, time, place, or named situation.
4. NO BANNED OPENERS: Does not start with "I've seen", "I've realized", "As a [role]", "I used to", "I sat/stood/walked/spent", "I was surprised", "I spent".

HOOK:
${hook}

Reply with exactly one of:
PASS
FAIL: [one sentence stating the specific criterion that failed]`
    }]
  });
  const text = response.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return {
    pass: /^PASS/i.test(text),
    reason: /^FAIL/i.test(text) ? text.replace(/^FAIL:\s*/i, '').trim() : null,
    raw: text,
  };
}

// ── Server API helpers ────────────────────────────────────────────────────────
async function generatePost(tc, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${SERVER}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({ name: tc.name, role: tc.role, length: tc.length, messages: tc.messages }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Generate failed ${res.status}: ${err.error || 'unknown'}`);
      }
      const data = await res.json();
      return data.post;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        console.log(`    (attempt ${attempt + 1} failed, retrying in 3s...)`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  throw lastErr;
}

async function regenHook(tc, currentPost) {
  const res = await fetch(`${SERVER}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({
      name: tc.name, role: tc.role, length: tc.length,
      messages: tc.messages, hookOnly: true, currentPost,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Regen failed ${res.status}: ${err.error || 'unknown'}`);
  }
  const data = await res.json();
  return data.post;
}

// ── Main test runner ──────────────────────────────────────────────────────────
async function runTest(tc, index, globalIndex) {
  const label = `[${String(globalIndex + 1).padStart(2, '0')}] ${tc.name} (${tc.role})`;
  console.log(`\n${label}`);

  let post;
  try {
    post = await generatePost(tc);
  } catch (err) {
    console.log(`  ✗ Generate failed: ${err.message}`);
    return { name: tc.name, role: tc.role, error: err.message, regens: 0, passed: false };
  }

  let hook = extractHook(post);
  let wc = hook.replace(/\n/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  console.log(`  Initial (${wc}w): ${hook.replace(/\n/g, ' | ')}`);

  let eval_ = await evaluateHook(hook);
  let regens = 0;

  if (!eval_.pass) console.log(`  ✗ FAIL: ${eval_.reason}`);

  while (!eval_.pass && regens < MAX_REGEN) {
    regens++;
    console.log(`  → Regen ${regens}...`);
    try {
      post = await regenHook(tc, post);
    } catch (err) {
      console.log(`    ✗ Regen failed: ${err.message}`);
      break;
    }
    hook = extractHook(post);
    wc = hook.replace(/\n/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    eval_ = await evaluateHook(hook);
    console.log(`    (${wc}w): ${hook.replace(/\n/g, ' | ')}`);
    if (!eval_.pass) console.log(`    ✗ FAIL: ${eval_.reason}`);
  }

  const status    = eval_.pass ? '✓ PASS' : '✗ FAILED';
  const regenNote = regens === 0 ? 'first try' : `${regens} regen${regens > 1 ? 's' : ''}`;
  console.log(`  ${status} (${regenNote})`);
  console.log(`  ┌─ FINAL HOOK ────────────────────────────────`);
  hook.split('\n').forEach(line => console.log(`  │  ${line}`));
  console.log(`  └─ ${wc} words ──────────────────────────────`);

  return { name: tc.name, role: tc.role, regens, passed: eval_.pass, hook, wc };
}

async function main() {
  const batchLabel = BATCH ? `Batch ${BATCH}/${TOTAL_BATCHES} (tests ${START + 1}–${END})` : `All ${ALL_CASES.length} tests`;
  console.log('═══════════════════════════════════════════════');
  console.log(` Hook Quality Test — ${batchLabel}`);
  console.log('═══════════════════════════════════════════════');
  console.log(`Server: ${SERVER}  |  Max regens: ${MAX_REGEN}\n`);

  const results = [];
  for (let i = 0; i < TEST_CASES.length; i++) {
    const result = await runTest(TEST_CASES[i], i, START + i);
    results.push(result);
    if (i < TEST_CASES.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  const passed      = results.filter(r => r.passed && !r.error);
  const failed      = results.filter(r => !r.passed && !r.error);
  const errors      = results.filter(r => r.error);
  const regenCounts = results.filter(r => !r.error).map(r => r.regens);
  const totalRegens = regenCounts.reduce((a, b) => a + b, 0);
  const avgRegens   = regenCounts.length ? (totalRegens / regenCounts.length).toFixed(2) : '—';
  const passRate    = results.length ? ((passed.length / results.length) * 100).toFixed(1) : '—';

  console.log('\n═══════════════════════════════════════════════');
  console.log(` RESULTS — ${batchLabel}`);
  console.log('═══════════════════════════════════════════════');
  console.log(`  Passed         : ${passed.length}/${results.length}`);
  console.log(`  Failed (max)   : ${failed.length}`);
  console.log(`  Errors         : ${errors.length}`);
  console.log(`  Pass rate      : ${passRate}%`);
  console.log(`  Total regens   : ${totalRegens}`);
  console.log(`  Avg regens/test: ${avgRegens}`);
  console.log('\n  Breakdown:');
  results.forEach((r, i) => {
    const n      = String(START + i + 1).padStart(2, '0');
    const status = r.error ? '✗ ERR' : r.passed ? '✓' : '✗';
    const wc     = r.wc ? ` (${r.wc}w)` : '';
    console.log(`    ${n}. ${status}  ${r.regens ?? 0} regen${(r.regens ?? 0) !== 1 ? 's' : ''}${wc}  — ${r.name}`);
  });

  // Surface any patterns for fixing
  const failPatterns = results.filter(r => !r.passed && !r.error);
  if (failPatterns.length) {
    console.log('\n  ⚠ Still-failing hooks:');
    failPatterns.forEach(r => console.log(`    — ${r.name}: ${r.hook?.replace(/\n/g, ' | ')}`));
  }
  console.log('═══════════════════════════════════════════════\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
