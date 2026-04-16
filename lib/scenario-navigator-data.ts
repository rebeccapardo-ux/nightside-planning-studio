// ---------------------------------------------------------------------------
// Source reference types and registry
// ---------------------------------------------------------------------------

export type Source = {
  id: string
  shortLabel: string   // shown in inline reveal
  citation: string     // shown on Sources page
  url: string
}

export const SOURCES: Record<string, Source> = {
  'aha-cpr': {
    id: 'aha-cpr',
    shortLabel: 'American Heart Association',
    citation: 'American Heart Association. CPR Facts and Statistics.',
    url: 'https://cpr.heart.org/en/resources/cpr-facts-and-stats',
  },
  'als-ventilation': {
    id: 'als-ventilation',
    shortLabel: 'ALS Society of Canada',
    citation: 'ALS Society of Canada. Ventilation.',
    url: 'https://als.ca/wp-content/uploads/2024/01/Ventilation-English.pdf',
  },
  'als-palliative': {
    id: 'als-palliative',
    shortLabel: 'ALS Society of Canada',
    citation: 'ALS Society of Canada. Palliative Care.',
    url: 'https://als.ca/wp-content/uploads/2024/03/ALSC_FactSheet_Palliative_Care_EN.pdf',
  },
  'lancet-bipap': {
    id: 'lancet-bipap',
    shortLabel: 'The Lancet Neurology (2006)',
    citation:
      '"Effects of non-invasive ventilation on survival and quality of life in patients with amyotrophic lateral sclerosis: a randomised controlled trial." The Lancet Neurology (2006).',
    url: 'https://www.thelancet.com/journals/laneur/article/PIIS1474-4422(05)70326-4/abstract',
  },
  'hopkins-pancreatic': {
    id: 'hopkins-pancreatic',
    shortLabel: 'Johns Hopkins Medicine',
    citation: 'Johns Hopkins Medicine. Pancreatic Cancer Prognosis.',
    url: 'https://www.hopkinsmedicine.org/health/conditions-and-diseases/pancreatic-cancer/pancreatic-cancer-prognosis',
  },
  'nejm-palliative': {
    id: 'nejm-palliative',
    shortLabel: 'New England Journal of Medicine (2010)',
    citation:
      '"Early Palliative Care for Patients with Metastatic Non–Small-Cell Lung Cancer." New England Journal of Medicine (2010).',
    url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa1000678',
  },
  'supportive-care-pancreatic': {
    id: 'supportive-care-pancreatic',
    shortLabel: 'Supportive Care in Cancer (2023)',
    citation:
      '"The impact of early palliative care on the quality of life of patients with advanced pancreatic cancer: The IMPERATIVE case-crossover study." Supportive Care in Cancer (2023).',
    url: 'https://link.springer.com/article/10.1007/s00520-023-07709-3',
  },
  'bmj-dementia': {
    id: 'bmj-dementia',
    shortLabel: 'BMJ Open (2022)',
    citation:
      '"Potentially avoidable causes of hospitalisation in people with dementia: contemporaneous associations by stage of dementia in a South London clinical cohort." BMJ Open (2022).',
    url: 'https://bmjopen.bmj.com/content/12/4/e055447',
  },
}

// ---------------------------------------------------------------------------
// Content and scenario types
// ---------------------------------------------------------------------------

export type Resource = {
  label: string
  url?: string
}

// A block of text with an optional inline source reference.
export type ContentBlock = {
  text: string
  sourceId?: string   // key into SOURCES
}

export type ScenarioChoice = {
  id: string
  label: string
  outcomeTitle: string
  summary: string[]        // "Summary of Outcome" — narrative paragraphs
  didYouKnow: ContentBlock[] // "Did you know?" — one or more sourced/unsourced blocks
  reflectionQuestions: string[]
  resources: Resource[]
}

export type Scenario = {
  id: string
  title: string
  tileOverview: string
  fullOverview: string
  choices: ScenarioChoice[]
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export const SCENARIOS: Scenario[] = [
  // ---------------------------------------------------------------------------
  // Scenario 1: The CPR Decision (slides 2–4)
  // ---------------------------------------------------------------------------
  {
    id: 'cpr-decision',
    title: 'The CPR Decision',
    tileOverview:
      'You experience a sudden health crisis (cardiac arrest, stroke). Emergency responders arrive and need to know: Should they attempt CPR and full life support?',
    fullOverview:
      'You experience a sudden health crisis (cardiac arrest, stroke). Emergency responders arrive and need to know: Should they attempt CPR and full life support?',
    choices: [
      {
        id: 'full-resuscitation',
        label: 'Attempt full resuscitation (CPR, ventilation, ICU care)',
        outcomeTitle: 'Full Resuscitation',
        summary: [
          'CPR is performed on the scene, and after several minutes, your heart starts beating again. However, you sustain broken ribs and bruising due to the force of compressions. You are transported to the hospital and placed in the ICU on a ventilator.',
          'The doctors inform your family that recovery will be difficult and may lead to significant physical and cognitive impairments.',
        ],
        didYouKnow: [
          {
            text: 'CPR has a success rate of around 10% in out-of-hospital cardiac arrests, and many survivors experience lasting health complications.',
            sourceId: 'aha-cpr',
          },
          {
            text: 'CPR can result in broken bones, brain damage due to lack of oxygen, and other serious side effects, especially in older adults.',
          },
        ],
        reflectionQuestions: [
          "How do you feel about CPR attempts if there's a high risk of long-term impairment?",
          'Does this align with how you want your loved ones to remember your final days?',
          'Have you discussed CPR preferences with your loved ones and medical team?',
        ],
        resources: [
          {
            label:
              'Heart and Stroke Foundation of Canada – CPR techniques, success rates, and the importance of timely intervention',
            url: 'https://heartandstroke.ca',
          },
        ],
      },
      {
        id: 'limited-interventions',
        label: 'Opt for limited interventions (oxygen, IV fluids, no CPR)',
        outcomeTitle: 'Limited Interventions',
        summary: [
          'You receive medical support, such as oxygen and IV fluids, but no CPR or aggressive interventions. If your heart stops, doctors focus on comfort rather than attempting resuscitation.',
          'Your loved ones are able to be with you instead of watching a prolonged ICU stay.',
        ],
        didYouKnow: [
          {
            text: 'Choosing not to have CPR does not mean giving up on care. Many people opt for comfort measures that prioritize pain management and quality of life over aggressive life-saving interventions.',
          },
        ],
        reflectionQuestions: [
          'How does this outcome align with your values and vision for your last moments?',
          'Are you comfortable with the implications of not receiving life-saving measures like CPR?',
        ],
        resources: [
          {
            label:
              'Canadian Virtual Hospice – Provides information on advance care planning, including the decision-making process around resuscitation and palliative care options',
            url: 'https://virtualhospice.ca',
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Scenario 2: Navigating Late-Stage ALS (slides 5–8)
  // ---------------------------------------------------------------------------
  {
    id: 'late-stage-als',
    title: 'Navigating Late-Stage ALS',
    tileOverview:
      'You have been living with amyotrophic lateral sclerosis (ALS) for several years, and the neurodegenerative disease has now reached an advanced stage.',
    fullOverview:
      'You have been living with amyotrophic lateral sclerosis (ALS) for several years, and the neurodegenerative disease has now reached an advanced stage. You are no longer able to communicate or make decisions for yourself due to severe muscle weakness, including the inability to speak or swallow. You rely on a feeding tube for nutrition and need full assistance with daily activities. You are also experiencing increasing difficulty breathing due to weakened respiratory muscles.\n\nThe medical team has informed your substitute decision-maker (SDM) that you will likely need a mechanical ventilator to help with breathing in the near future. Your SDM must decide how to proceed with your care.',
    choices: [
      {
        id: 'ventilator',
        label: 'Receive a ventilator to prolong life',
        outcomeTitle: 'Mechanical Ventilation',
        summary: [
          'You are placed on a mechanical ventilator, requiring a tracheostomy (surgical airway tube). You cannot breathe independently, and medical staff must manage the machine.',
          'You live longer, but require 24-hour medical support and cannot speak without assistive technology.',
        ],
        didYouKnow: [
          {
            text: 'Mechanical ventilation can extend life for months or even years in people with advanced ALS but involves complex medical care and dependence on machines and caregivers.',
            sourceId: 'als-ventilation',
          },
        ],
        reflectionQuestions: [
          'Would you want mechanical ventilation if you could no longer speak or move independently?',
          'How long would you want to stay on a ventilator if your condition worsens?',
        ],
        resources: [
          {
            label:
              'ALS Society of Canada – detailed information on treatment options, including mechanical ventilation, and their impact on quality of life',
            url: 'https://als.ca',
          },
        ],
      },
      {
        id: 'palliative-care',
        label: 'Transition to palliative-focused care and focus on comfort measures',
        outcomeTitle: 'Palliative-Focused Care',
        summary: [
          'Instead of a ventilator, your SDM chooses to focus on comfort care and symptom relief. Doctors provide medications for breathing difficulties and muscle symptoms, but you do not receive life-prolonging interventions. You remain in a hospice or home setting, surrounded by loved ones.',
        ],
        didYouKnow: [
          {
            text: 'Medications help manage pain and difficulty breathing at end of life.',
          },
          {
            text: 'One study found that between 88 and 98% of people with ALS die peacefully.',
            sourceId: 'als-palliative',
          },
        ],
        reflectionQuestions: [
          'How do you feel about declining life-prolonging treatments for ALS?',
          'Who would you want by your side in your final days?',
        ],
        resources: [
          {
            label:
              'Canadian Hospice Palliative Care Association – information on hospice services, including the support available for patients with ALS',
            url: 'https://chpca.ca',
          },
        ],
      },
      {
        id: 'non-invasive-support',
        label: 'Use non-invasive breathing support & adaptive communication tools',
        outcomeTitle: 'Non-Invasive Support',
        summary: [
          'Instead of full ventilation, you use non-invasive breathing devices (e.g., BiPAP) to ease symptoms. You rely on assistive communication technology (eye-tracking devices, text-to-speech software) to continue engaging with loved ones.',
          'Eventually, your SDM will need to decide if or when to transition fully to comfort care.',
        ],
        didYouKnow: [
          {
            text: 'BiPAP can significantly extend survival and improve comfort in ALS, but it does not stop respiratory decline. Eventually, people using BiPAP must decide whether to transition to full mechanical ventilation or palliative care.',
            sourceId: 'lancet-bipap',
          },
          {
            text: 'Assistive communication devices like eye-tracking software and text-to-speech tools allow many people with ALS to communicate effectively even in advanced stages of the disease. Renowned physicist Stephen Hawking used an adaptive speech-generating device for decades.',
          },
        ],
        reflectionQuestions: [
          'Would you want to use assistive devices to communicate as long as possible?',
          'At what point would you want to stop interventions and focus solely on comfort?',
        ],
        // TODO: no resources extracted from this slide — "Next Steps" section present
        // but contained no text. Check source workbook for omitted resource links.
        resources: [],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Scenario 3: Advanced Pancreatic Cancer (slides 9–12)
  // ---------------------------------------------------------------------------
  {
    id: 'pancreatic-cancer',
    title: 'Advanced Pancreatic Cancer',
    tileOverview:
      'You have been living with Stage IV pancreatic cancer, which has spread to other organs. Your substitute decision-maker is faced with deciding the next steps.',
    fullOverview:
      'You have been living with Stage IV pancreatic cancer, which has spread to other organs. After undergoing several rounds of chemotherapy and other treatments, your health has significantly declined. You are no longer able to make or communicate decisions about your care, and your substitute decision-maker is faced with deciding the next steps.\n\nThe medical team informs your substitute decision-maker that additional treatments may not significantly extend your life but could involve more side effects. Alternatively, they can transition to comfort-focused care or consider enrolling you in a clinical trial.\n\nWhat would you want your substitute decision-maker to choose?',
    choices: [
      {
        id: 'aggressive-treatment',
        label: 'Continue aggressive treatments (chemotherapy, radiation, surgery)',
        outcomeTitle: 'Aggressive Treatment',
        summary: [
          'Your substitute decision-maker chooses to continue aggressive treatments, including chemotherapy, radiation, or surgery.',
          'These treatments may offer a chance to prolong your life, but they will likely come with side effects such as fatigue, pain, nausea, and a reduced ability to participate in daily activities.',
        ],
        didYouKnow: [
          {
            text: 'Stage IV pancreatic cancer has a 5-year survival rate of about 1%, and aggressive treatments at this stage are often aimed at slowing the progression of the disease rather than curing it.',
            sourceId: 'hopkins-pancreatic',
          },
          {
            text: 'Chemotherapy and other treatments can cause significant side effects, and many patients experience a decline in their quality of life during this phase.',
          },
        ],
        reflectionQuestions: [
          'How much additional treatment burden would you be willing to endure for the chance of more time?',
          'What role does your quality of life play in the decision to pursue further aggressive treatments?',
        ],
        resources: [
          {
            // No URL present in workbook for this entry
            label: 'Canadian Cancer Society – advanced cancer treatment options',
          },
          {
            label:
              'Pancreatic Cancer Action Network (PANCAN) – information and resources specific to pancreatic cancer',
            url: 'https://pancan.org',
          },
        ],
      },
      {
        id: 'comfort-care',
        label: 'Transition to comfort-focused care (hospice and palliative care)',
        outcomeTitle: 'Comfort-Focused Care',
        summary: [
          'Your SDM declines further chemotherapy and hospital treatments, shifting the focus to symptom management, pain relief, and emotional support.',
          'You spend more time at home with loved ones rather than in hospitals. Your medical team helps manage nausea, pain, and anxiety, ensuring comfort.',
        ],
        didYouKnow: [
          {
            text: 'In some studies, patients with terminal cancer who received early palliative care actually lived longer than those who pursued aggressive treatment until the end.',
            sourceId: 'nejm-palliative',
          },
          {
            text: 'For pancreatic cancer specifically, early palliative care is associated with improved quality of life.',
            sourceId: 'supportive-care-pancreatic',
          },
        ],
        reflectionQuestions: [
          'Would you want to stop treatments if it meant spending more quality time at home?',
          'What aspects of comfort (e.g., pain relief, emotional support) are most important to you as you near the end of your illness?',
        ],
        resources: [
          {
            label: 'Canadian Virtual Hospice - palliative care information and support',
            url: 'https://virtualhospice.ca',
          },
          {
            label:
              'Canadian Hospice Palliative Care Association – tools and resources for families navigating hospice and palliative care',
            url: 'https://chpca.ca',
          },
        ],
      },
      {
        id: 'clinical-trial',
        label: 'Enroll in a clinical trial',
        outcomeTitle: 'Clinical Trial',
        summary: [
          'Your substitute decision-maker chooses to enroll you in a clinical trial, which may offer experimental treatments not yet widely available.',
          'While these treatments could provide an opportunity to slow the progression of your cancer, they come with unknown risks and are unlikely to result in a cure. Trials may involve additional travel, frequent hospital visits, and unknown side effects.',
        ],
        didYouKnow: [
          {
            text: "Clinical trials can offer access to cutting-edge treatments that are not yet part of standard care. However, these treatments are often experimental, with uncertain outcomes, and many patients in late-stage cancer trials do not experience significant life extension. It's also important to consider the physical and emotional toll of the trial process.",
          },
        ],
        reflectionQuestions: [
          'How do you feel about participating in experimental treatments with uncertain outcomes?',
          'Would you be comfortable spending a significant amount of your remaining time traveling for medical visits and undergoing frequent tests in hopes of an uncertain benefit?',
          "How much would the potential benefits of being part of scientific research matter to you, even if it doesn't result in a cure for your condition?",
        ],
        resources: [
          {
            label: 'Canadian Cancer Trials – ongoing cancer clinical trials across Canada',
            url: 'https://canadiancancertrials.ca',
          },
          {
            label:
              'Canadian Cancer Society – overview of clinical trials and answers to frequently asked questions',
            url: 'https://cancer.ca',
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Scenario 4: Cognitive Decline (slides 13–16)
  // ---------------------------------------------------------------------------
  {
    id: 'cognitive-decline',
    title: 'Cognitive Decline',
    tileOverview:
      "You have been diagnosed with Alzheimer's disease, and your cognitive abilities have progressively deteriorated. You can no longer make decisions or clearly communicate your preferences.",
    fullOverview:
      "You have been diagnosed with Alzheimer's disease, and your cognitive abilities have progressively deteriorated. You can no longer make decisions or clearly communicate your preferences.\n\nYour substitute decision-maker must now decide on your care needs.",
    choices: [
      {
        id: 'aggressive-treatment',
        label:
          'Continue aggressive treatments (hospitalization, surgeries) for new health issues.',
        outcomeTitle: 'Aggressive Treatment',
        summary: [
          'Each new illness or infection is treated with hospitalization, surgery, or antibiotics. You develop difficulty swallowing, and doctors recommend a feeding tube to maintain nutrition.',
          'Your SDM struggles with balancing prolonging life vs. prioritizing comfort.',
        ],
        didYouKnow: [
          {
            text: 'Patients with late-stage dementia often experience diminished ability to tolerate invasive treatments, and these procedures may not offer a meaningful extension of life.',
          },
        ],
        reflectionQuestions: [
          'Would you want every medical issue aggressively treated, or should there be a point where interventions stop?',
          "How do you feel about feeding tubes in late-stage Alzheimer's?",
        ],
        resources: [
          {
            label:
              'Alzheimer Society of Canada – information on how aggressive treatments for other health issues (such as infections, surgeries, or respiratory issues) can affect those with dementia',
            url: 'https://alzheimer.ca',
          },
        ],
      },
      {
        id: 'comfort-care',
        label: 'Transition to comfort-focused care (palliative care, no hospital visits).',
        outcomeTitle: 'Comfort-Focused Care',
        summary: [
          'Your substitute decision-maker has chosen to prioritize comfort over life-prolonging interventions.',
          'If you develop infections, doctors do not hospitalize you or give IV antibiotics—instead, they focus on comfort.',
          'You remain at home, surrounded by familiar people and spaces, with hospice teams visiting to provide care.',
        ],
        didYouKnow: [
          {
            // Screenshot confirms superscript 8 on this sentence only
            text: "Many people with Alzheimer's are hospitalized unnecessarily due to lack of care directives—but studies show this often reduces quality of life without extending survival.",
            sourceId: 'bmj-dementia',
          },
          {
            // No superscript on this sentence — confirmed by screenshot
            text: 'For individuals with late-stage dementia, comfort-focused care can offer pain relief and emotional support while avoiding interventions that may cause distress without clear benefits.',
          },
        ],
        reflectionQuestions: [
          'Would you prefer to remain in a familiar environment (home, care facility) rather than being admitted to a hospital for treatments?',
          'Have you communicated these preferences to your SDM?',
        ],
        resources: [
          {
            label:
              'Canadian Hospice Palliative Care Association – resources and tools to support palliative care transitions',
            url: 'https://chpca.ca',
          },
        ],
      },
      {
        id: 'long-term-care',
        label: 'Transition to a long-term care facility',
        outcomeTitle: 'Long-Term Care',
        summary: [
          'Your substitute decision-maker has opted for a long-term care facility, with an emphasis on managing your day-to-day needs in a setting that can provide ongoing support. where trained staff manage your daily needs.',
          'Your family visits but is not responsible for your medical care.',
        ],
        didYouKnow: [
          {
            text: 'Long-term care facilities are equipped to manage the complex needs of individuals with advanced dementia, providing 24-hour care that includes medical supervision and personal assistance.',
          },
          {
            text: 'In Canada, long-term care facility placements often involve waitlists, and access depends on financial and provincial healthcare policies.',
          },
        ],
        reflectionQuestions: [
          'How do you feel about moving into a facility vs. staying at home with support?',
          'Would you prefer to be in a private facility or a government-funded long-term care home?',
          'How important is it to you to remain in a familiar or comforting environment, even as your needs increase?',
          'What role do you envision for your loved ones in your care if you are placed in a long-term care setting or hospice?',
        ],
        // TODO: no resources extracted from this slide — "Next Steps" section present
        // but contained no text. Check source workbook for omitted resource links.
        resources: [],
      },
    ],
  },
]
