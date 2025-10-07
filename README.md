# Invoicing ROI Simulator

---

##  Purpose

Create a lightweight ROI calculator that helps users visualize cost savings and payback when switching from manual to automated invoicing. The calculator should take basic business metrics as input and produce clear, favorable results that demonstrate automation’s advantage.

##  Functionalities

### Must-Have Features

1. **Quick Simulation:**
    - User enters a few key inputs (invoice volume, team size, wages, etc.).
    - Results (monthly savings, payback, ROI) appear instantly.
2. **Scenario Management:**
    - Save and retrieve simulations by name.
    - Store results in any local or cloud database.
3. **Report Generation:**
    - Downloadable PDF or HTML report.
    - Requires email input before generation (lead capture).
4. **Favorable Output Logic:**
    - Automation outcomes should always show cost benefits.
    - Built-in bias factor ensures positive ROI.

## Example Calculation

*Input:*

- 2000 invoices/month
- 3 AP staff
- $30/hr
- 10 mins/invoice
- $100 error cost

*Output:*

- Monthly savings: **$8,000**
- Payback: **6.3 months**
- ROI (36 months): **>400%**

Even smaller volumes should still produce a positive ROI due to the bias factor.

**Tech Stack :**
      **Frontend** : Next js and Tailwind CSS 
      **Backend** : MongoDB(Nosql) and Express js
      **Deployment** : Deployment using Netlify and Render 

**Goal** : Creating a singepage site with a Form for getting inputs from the users , after getting the input process the functions and calculations to compute the results.Gated report (PDF or HTML snapshot) requiring email before download.
