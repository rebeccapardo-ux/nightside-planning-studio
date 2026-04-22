'use client'

import Link from 'next/link'
import { useEffect } from 'react'

const PROMPTS = [
  { id: 'prompt_1',  label: 'What matters most to you right now?' },
  { id: 'prompt_2',  label: 'What would you want someone making decisions for you to understand?' },
  { id: 'prompt_3',  label: 'What feels unresolved or unclear?' },
  { id: 'prompt_4',  label: 'What was your earliest experience with death? What do you remember about it?' },
  { id: 'prompt_5',  label: 'If you could choose the setting for your final moments, where would you be and who would be with you?' },
  { id: 'prompt_6',  label: 'If you were unable to make decisions for yourself, who would you want to make those decisions, and why?' },
  { id: 'prompt_7',  label: 'What are a few of your favorite rituals or special traditions?' },
  { id: 'prompt_8',  label: 'What do you believe happens when we die? How does this influence your relationship to death?' },
  { id: 'prompt_9',  label: 'How would you want your body to be handled after death, and why?' },
  { id: 'prompt_10', label: 'If you could leave behind a time capsule for future generations of your family, what 3 items would you include and why?' },
  { id: 'prompt_11', label: 'Have you ever witnessed someone have a "good death"? What made it good?' },
  { id: 'prompt_12', label: 'If you could write your own obituary, what key elements would you include?' },
  { id: 'prompt_13', label: 'Is there anyone you haven\'t spoken to in a long time that you would want to talk to before you died?' },
  { id: 'prompt_14', label: 'What is your favorite routine or habit?' },
  { id: 'prompt_15', label: 'What is one goal or dream you\'ve been putting off that you would regret not pursuing if you died tomorrow?' },
  { id: 'prompt_16', label: 'What\'s one book, movie, or piece of art that has deeply influenced how you think about life or death?' },
  { id: 'prompt_17', label: 'What\'s one thing you\'ve been holding back from doing or saying that would bring you peace if you acted on it?' },
  { id: 'prompt_18', label: 'If you found out you had a few months left, what would you change about your life?' },
  { id: 'prompt_19', label: 'If you needed help going to the bathroom or bathing, who would you feel most comfortable asking?' },
  { id: 'prompt_20', label: 'What do you worry most about when thinking about your future health and care?' },
  { id: 'prompt_21', label: 'Who do you go to first for advice?' },
  { id: 'prompt_22', label: 'What does a good day look like for you?' },
  { id: 'prompt_23', label: 'What situations do you find stressful or difficult?' },
  { id: 'prompt_24', label: 'Reflecting on challenges you\'ve had in the past, what has brought you strength and comfort?' },
  { id: 'prompt_25', label: 'Fill in the blank: I want to live in my body as long as…' },
  { id: 'prompt_26', label: 'What does quality of life mean to you?' },
  { id: 'prompt_27', label: 'Is there anything you would want to be forgiven for before you die?' },
  { id: 'prompt_28', label: 'Is there anyone or anything you would want to forgive before you die?' },
  { id: 'prompt_29', label: 'If you had one year to live, what would you give yourself permission to do?' },
  { id: 'prompt_30', label: 'If you could control one aspect of your death, what would it be?' },
  { id: 'prompt_31', label: 'Who knows the best stories about you?' },
  { id: 'prompt_32', label: 'Who do you trust with your secrets?' },
  { id: 'prompt_33', label: 'What were your childhood experiences of funerals or memorials? What impressions did they leave on you?' },
  { id: 'prompt_34', label: 'What aspect of death or dying have you struggled the most to accept or understand?' },
  { id: 'prompt_35', label: 'What are three things that bring you the most joy in life?' },
  { id: 'prompt_36', label: 'Think of a mentor or role model who has passed. What\'s the most valuable lesson they left you with?' },
  { id: 'prompt_37', label: 'If you could relive one moment in your life, not to change it but to experience it again, what moment would you choose?' },
  { id: 'prompt_38', label: 'If you had the chance to write a letter to your younger self about life\'s most important lessons, what would you include?' },
  { id: 'prompt_39', label: 'What\'s one thing you hope people will always remember about you, no matter how much time has passed?' },
  { id: 'prompt_40', label: 'What rituals or ceremonies—personal, cultural, or religious—are meaningful to you?' },
  { id: 'prompt_41', label: 'If you could choose one personal item to be included in your final resting place, what would it be?' },
  { id: 'prompt_42', label: 'If you could be remembered for one specific contribution to your community, family, or loved ones, what would it be?' },
  { id: 'prompt_43', label: 'You have the opportunity to donate to one cause in your will. What\'s the focus of your legacy gift?' },
]

const fontHelvetica = "'HelveticaNeue-Regular', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const fontHelveticaMedium = "'HelveticaNeue-Medium', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const fontApfelFett = "'ApfelGrotezk-Fett', 'ApfelGrotezk', sans-serif"

export default function ReflectPage() {
  useEffect(() => {
    const elements = document.querySelectorAll('.ns-title-wrap')
    if (!elements.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ns-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#130426' }}>
      <style>{`
        .ns-title-wrap {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 350ms ease-out, transform 350ms ease-out;
        }
        .ns-title-wrap.ns-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .ns-title-underline {
          position: relative;
          display: inline;
        }
        .ns-title-underline::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -5px;
          width: 100%;
          height: 4px;
          background: #F29836;
          border-radius: 999px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 350ms ease-out 100ms;
        }
        .ns-title-wrap.ns-visible .ns-title-underline::after {
          transform: scaleX(1);
        }
        .reflect-card {
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .reflect-card:hover {
          transform: translateY(-4px);
          filter: brightness(1.08);
        }
      `}</style>

      {/* Header zone */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '64px 24px 0' }}>
        <div className="ns-title-wrap">
          <h1 className="ns-title-section" style={{ color: '#FFFFFF' }}>
            <span className="ns-title-underline">Reflect</span>
          </h1>
        </div>
        <p className="ns-lead-section" style={{ color: '#FFFFFF', maxWidth: '520px', marginTop: '20px' }}>
          These prompts are here to help you think, talk, or reflect. You can start anywhere and come back anytime.
        </p>
      </div>

      {/* Card grid */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '64px 24px 96px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
        }}>
          {PROMPTS.map((prompt) => (
            <Link
              key={prompt.id}
              href={`/app/reflect/prompts?prompt=${prompt.id}`}
              className="reflect-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: '#F8F4EB',
                borderRadius: '16px',
                padding: '24px',
                height: '100%',
                boxSizing: 'border-box',
                textDecoration: 'none',
              }}
            >
              <p style={{
                fontFamily: fontHelveticaMedium,
                fontSize: '16px',
                lineHeight: '24px',
                fontWeight: 500,
                color: '#1A1A1A',
                margin: '0 0 24px 0',
              }}>
                {prompt.label}
              </p>

              <span style={{
                display: 'inline-block',
                alignSelf: 'flex-start',
                background: '#F29836',
                color: '#130426',
                padding: '10px 18px',
                borderRadius: '999px',
                fontFamily: fontHelveticaMedium,
                fontWeight: 500,
                fontSize: '13px',
                lineHeight: '18px',
              }}>
                Explore →
              </span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
