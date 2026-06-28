import { useState } from "react"

export default function FAQ() {
  const faqs = [
    {
      question: "Is this built with real ShadCN components?",
      answer:
        "Yes. Pulse UI is built using ShadCN UI and Radix primitives with full customization capability.",
    },
    {
      question: "Can I use this for client projects?",
      answer:
        "Yes. The regular ThemeForest license allows usage in a single end product. Extended license is available if needed.",
    },
    {
      question: "Is it easy to customize?",
      answer:
        "Absolutely. The project follows a clean folder structure with reusable components and Tailwind utility classes.",
    },
    {
      question: "Will I get future updates?",
      answer:
        "Yes. All future updates and improvements will be provided free for existing buyers.",
    },
  ]

  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-24 bg-white" id="faq">
      <div className="container-custom max-w-3xl">

        <h2 className="text-4xl font-bold text-center">
          Frequently Asked Questions
        </h2>

        <div className="mt-12 space-y-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border rounded-2xl p-6 cursor-pointer"
              onClick={() =>
                setOpenIndex(openIndex === index ? null : index)
              }
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">
                  {faq.question}
                </h3>
                <span>{openIndex === index ? "-" : "+"}</span>
              </div>

              {openIndex === index && (
                <p className="mt-4 text-gray-600">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}