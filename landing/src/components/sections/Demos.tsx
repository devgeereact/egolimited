import FadeIn from "@/components/ui/FadeIn"

export default function Demos() {
  const demos = [
      {
        title: "Analytics Dashboard",
        desc: "Comprehensive analytics dashboard with advanced charts, KPIs, and performance insights for data-driven decisions.",
        image: "/pulse-ui/landing-page/images/dashboard-1.png",
        url: "https://codervent.com/pulse-ui/dashboard/analytics",
      },
      {
        title: "eCommerce Dashboard",
        desc: "Complete eCommerce management system with products, orders, revenue tracking, and customer analytics.",
        image: "/pulse-ui/landing-page/images/dashboard-2.png",
        url: "https://codervent.com/pulse-ui/dashboard/ecommerce",
      },
      {
        title: "CRM Admin",
        desc: "Powerful CRM interface for managing leads, customers, sales pipelines, and business interactions efficiently.",
        image: "/pulse-ui/landing-page/images/dashboard-3.png",
        url: "https://codervent.com/pulse-ui/dashboard/crm",
      },
      {
        title: "Chat Application",
        desc: "Real-time chat interface with modern messaging UI, conversation management, and responsive layout.",
        image: "/pulse-ui/landing-page/images/chatbox.png",
        url: "https://codervent.com/pulse-ui/app/chatbox",
      },
     {
      title: "Data Widgets",
      desc: "Advanced data widgets with live metrics, performance indicators, and customizable UI components.",
      image: "/pulse-ui/landing-page/images/data-widget.png",
      url: "https://codervent.com/pulse-ui/widgets/data",
      },
    {
    title: "Profile Page",
    desc: "User profile layout with account settings, activity tracking, and editable personal information.",
    image: "/pulse-ui/landing-page/images/profile-page.png",
    url: "https://codervent.com/pulse-ui/account/profile",
    },
   ]

  return (
    <section className="py-28 bg-white" id="demos">
      <div className="container-custom text-center">

        <FadeIn>
          <h2 className="text-4xl font-bold">
            Multiple Ready-to-Use Demos
          </h2>
        </FadeIn>

        <FadeIn>
          <p className="mt-6 text-gray-600 max-w-2xl mx-auto">
            Choose from professionally designed dashboards tailored for
            real-world business applications.
          </p>
        </FadeIn>

        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {demos.map((demo, index) => (
            <FadeIn key={index}>
              <div className="group border rounded-2xl overflow-hidden shadow hover:shadow-2xl transition duration-500">

                {/* Screenshot */}
                <div className="overflow-hidden">
                  <img
                    src={demo.image}
                    alt={demo.title}
                    className="w-full h-88 object-cover group-hover:scale-110 transition duration-500"
                  />
                </div>

                {/* Content */}
                <div className="p-6 text-left">
                  <h3 className="font-semibold text-lg">
                    {demo.title}
                  </h3>

                  <p className="mt-2 text-md text-gray-600">
                    {demo.desc}
                  </p>

                  <div className="mt-4 w-full">
                    <a
                      href={demo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-black text-white py-2 px-5 rounded-lg text-center"
                    >
                      Live Preview
                    </a>
                  </div>
                </div>

              </div>
            </FadeIn>
          ))}
        </div>

      </div>
    </section>
  )
}