import Button from "@/components/ui/button"

export default function Pricing() {
  const plans = [
    {
      name: "Developer License",
      price: "$39",
      desc: "For individual developers and freelancers.",
      features: [
        "Single Project Use",
        "Lifetime Updates",
        "Email Support",
        "Full Source Code",
      ],
      popular: false,
    },
    {
      name: "Business License",
      price: "$89",
      desc: "Best for agencies and internal company projects.",
      features: [
        "Up to 10 Projects",
        "Priority Support",
        "Lifetime Updates",
        "Commercial Use",
      ],
      popular: true,
    },
    {
      name: "Extended / SaaS License",
      price: "$179",
      desc: "For SaaS platforms and large-scale redistribution.",
      features: [
        "Unlimited Projects",
        "SaaS / Commercial Redistribution",
        "Priority Support",
        "Lifetime Updates",
      ],
      popular: false,
    },
  ]

  return (
    <section className="py-28 bg-gray-50 bg-white dark:bg-zinc-900 transition-colors duration-300 text-center bg-gradient-to-b from-gray-50 to-white" id="pricing">
  <div className="container-custom">

    <h2 className="text-4xl font-bold text-black">
      Flexible Licensing for Every Need
    </h2>

    <p className="mt-6 text-gray-600 max-w-2xl mx-auto">
      Transparent pricing. Lifetime updates included.
      Choose the license that fits your business model.
    </p>

    <div className="mt-16 grid md:grid-cols-3 gap-10">

      {plans.map((plan, index) => (
        <div
          key={index}
          className={`relative rounded-2xl p-8 transition-all duration-300 ${
            plan.popular
              ? "bg-black text-white scale-105 shadow-2xl"
              : "bg-white border shadow-md hover:shadow-xl"
          }`}
        >

              {plan.popular && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-4 py-1 rounded-full">
                  Most Popular
                </span>
              )}

              <h3 className="text-xl font-semibold">
                {plan.name}
              </h3>

              <div className="mt-6 text-4xl font-bold">
                {plan.price}
              </div>

              <p className={`mt-4 text-base leading-relaxed ${
                plan.popular ? "text-gray-300" : "text-gray-600"
              }`}>
                {plan.desc}
              </p>

              <ul className={`mt-8 space-y-4 text-base font-medium ${
                plan.popular ? "text-gray-200" : "text-gray-700"
              }`}>
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                  <span className="text-green-500 text-lg">✔</span>
                  {feature}
                </li>
                ))}
              </ul>

          <div className="mt-10">
            <Button
              variant="outline"
              className={`w-full text-base font-semibold py-3 rounded-lg transition-all duration-300 shadow-md ${plan.popular
                  ? "!bg-white !text-black hover:!bg-gray-200"
                  : "!bg-black !text-white hover:!bg-gray-800"
                }`}
            >
              Buy License
            </Button>
          </div>

            </div>
          ))}

        </div>

      </div>
    </section>
  )
}