DaphOS Fullstack Coding Challenge – Staffing Forecast Cockpit
Background
DaphOS is a software platform that helps hospitals plan and manage their processes more efficiently.
Forecasts are at the core of our product: how many nurses will Ward B3 need next Tuesday? The forecast,
however, is only half the job – what matters is whether a ward manager can see within a few minutes where
things are getting tight, and whether they trust the number.
This challenge is about how you approach a real fullstack task – from designing the API to the finished user
interface.
Your Task
Build a small fullstack application that lets a ward manager review and correct the staffing demand forecast
for their team. The backend provides a REST API, the frontend consumes it. The clear focus is on the
frontend.
Your application should make the following possible:
• Display wards and their demand forecast – one calendar week at a time, showing for each day the
forecast demand, the planned staffing and the confidence of the forecast; it is possible to page
between weeks
• Make understaffing and uncertain forecasts recognizable at a glance – how you represent that
uncertainty is part of the task
• Override individual days manually – including validation (e.g. a mandatory justification above a certain
deviation, no corrections for past days, no negative values) – and keep it traceable who corrected what,
when and why
• Display a summary per ward for the week shown (total understaffing, number of manual corrections,
average deviation between forecast and corrected demand)
The forecast values may be static and come from a generated seed dataset. We explicitly do not expect a
trained model – we are interested in how you communicate uncertain numbers, not in how you calculate them.
Forecast data should be available for at least four weeks, including at least one week in the past.
The domain model and the API design are deliberately not prescribed – we are curious about your decisions
and the reasoning behind them. Authentication is not part of the task; a hard-coded user is sufficient for the
history.
Technical Framework
• Frontend: Angular (preferred) or React
• Backend: Python (preferred), Go or Rust
• Database: SQLite is sufficient – data should be stored persistently.
Submission
GitHub repository or ZIP archive containing:
• Source code (frontend + backend)
• One or two tests in the places where you consider tests most valuable. We explicitly do not expect full
coverage. We are more interested in your selection than in the quantity.
• README with setup instructions and a note on where the forecast data comes from
• Brief documentation of your architecture decisions (max. one page): Why did you cut the domain model
the way you did? Which API decisions did you make deliberately? How do you represent uncertainty in
the interface, and why in that way? What would you have done differently with more time?

Format
• Take-home challenge: approx. 4–5 hours, timeboxed. Anything you do not finish in that time –
document it briefly and discuss it in the follow-up.
• Follow-up conversation: 60 minutes – we go through the code together and talk about your decisions.
What We Evaluate
Frontend quality & UX thinking, component structure, handling of uncertain data in the interface, API design
and domain model, documented trade-offs, readability of the code