import { Routes, Route } from "react-router-dom"
import SiteLayout from "./site/SiteLayout"
import Home from "./pages/Home"
import About from "./pages/About"
import Services from "./pages/Services"
import ServiceDetail from "./pages/ServiceDetail"
import Sectors from "./pages/Sectors"
import Areas from "./pages/Areas"
import AreaDetail from "./pages/AreaDetail"
import Accreditations from "./pages/Accreditations"
import Resources from "./pages/Resources"
import ResourceArticle from "./pages/ResourceArticle"
import Contact from "./pages/Contact"
import Legal from "./pages/Legal"
import Track from "./pages/Track"
import Portal from "./pages/Portal"
import Survey from "./pages/Survey"
import Verify from "./pages/Verify"
import NotFound from "./pages/NotFound"

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="services" element={<Services />} />
        <Route path="services/:slug" element={<ServiceDetail />} />
        <Route path="sectors" element={<Sectors />} />
        <Route path="areas" element={<Areas />} />
        <Route path="areas/:slug" element={<AreaDetail />} />
        <Route path="accreditations" element={<Accreditations />} />
        <Route path="resources" element={<Resources />} />
        <Route path="resources/:slug" element={<ResourceArticle />} />
        <Route path="contact" element={<Contact />} />
        <Route path="track" element={<Track />} />
        <Route path="portal" element={<Portal />} />
        <Route path="survey" element={<Survey />} />
        <Route path="verify/:id" element={<Verify />} />
        <Route path="privacy" element={<Legal kind="privacy" />} />
        <Route path="terms" element={<Legal kind="terms" />} />
        <Route path="cookies" element={<Legal kind="cookies" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
