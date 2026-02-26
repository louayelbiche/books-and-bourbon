import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { fetchSiteImages, fetchPageContent, DEFAULT_PAGE_CONTENT, type CMSTeamPhoto } from '@/lib/cms'

const defaultTeam = [
  {
    name: 'Jessica Schaefer',
    role: 'Host',
    imageUrl: '/images/team/jessica-schaefer.webp',
    photoPosition: 'center 25%',
    bio: 'Jessica brings her passion for literature and meaningful conversations to every episode of Books and Bourbon.',
  },
  {
    name: 'Andy Duenas',
    role: 'Host',
    imageUrl: '/images/team/andy-duenas.jpg',
    photoPosition: 'center 15%',
    bio: 'Andy combines his love of storytelling with deep industry expertise to create engaging discussions.',
  },
  {
    name: 'Patrick Kearns',
    role: 'Host',
    imageUrl: '/images/team/patrick-kearns.jpg',
    photoPosition: 'center 20%',
    bio: 'Patrick contributes his unique perspective and thoughtful analysis to every literary conversation.',
  },
]

const DEFAULT_ABOUT_IMAGE = '/images/about-mission.jpg'
const DEFAULT_CTA_BG = '/images/cta-join-conversation.jpg'

export const revalidate = 3600

export default async function AboutPage() {
  const [siteImages, pageContent] = await Promise.all([
    fetchSiteImages(),
    fetchPageContent(),
  ])

  const about = pageContent.about || DEFAULT_PAGE_CONTENT.about
  const heroContent = about.hero || DEFAULT_PAGE_CONTENT.about.hero
  const mission = about.mission || DEFAULT_PAGE_CONTENT.about.mission
  const stats = about.stats?.length > 0 ? about.stats : DEFAULT_PAGE_CONTENT.about.stats
  const teamHeadings = about.team || DEFAULT_PAGE_CONTENT.about.team
  const values = about.values || DEFAULT_PAGE_CONTENT.about.values
  const cta = about.cta || DEFAULT_PAGE_CONTENT.about.cta

  const team: CMSTeamPhoto[] = siteImages.teamPhotos.length > 0
    ? siteImages.teamPhotos
    : defaultTeam

  const aboutImage = siteImages.aboutHeroImage || DEFAULT_ABOUT_IMAGE
  const ctaBackground = siteImages.ctaBackground || DEFAULT_CTA_BG
  return (
    <>
      {/* Hero Section */}
      <section className="pt-32 pb-24 bg-brand-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-brand-burgundy/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <p className="font-mono text-brand-burgundy-light font-medium tracking-[0.15em] uppercase text-sm mb-4">
            {heroContent.eyebrow}
          </p>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-brand-cream mb-6 max-w-4xl">
            {heroContent.title}
          </h1>
          <p className="text-text-secondary text-xl max-w-2xl">
            {heroContent.description}
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-display text-4xl text-brand-cream mb-6">
                {mission.heading}
              </h2>
              {mission.paragraphs.map((paragraph, i) => (
                <p key={i} className={`text-text-secondary leading-relaxed ${i < mission.paragraphs.length - 1 ? 'mb-6' : ''}`}>
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="relative">
              <div className="aspect-square relative burgundy-glow">
                <Image
                  src={aboutImage}
                  alt="Books and conversation"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-brand-burgundy flex items-center justify-center">
                <div className="text-center">
                  <p className="font-display text-4xl text-brand-cream">{mission.statValue}</p>
                  <p className="text-brand-cream/80 text-sm">{mission.statLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-brand-black border-y border-text-muted/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-4xl md:text-5xl text-brand-burgundy mb-2">
                  {stat.value}
                </p>
                <p className="text-brand-tan text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-mono text-brand-burgundy-light font-medium tracking-[0.15em] uppercase text-sm mb-4">
              {teamHeadings.eyebrow}
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-brand-cream">
              {teamHeadings.heading}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {team.map((member) => (
              <div key={member.name} className="text-center">
                <div className="w-48 h-48 mx-auto relative mb-6 burgundy-glow rounded-full overflow-hidden">
                  <Image
                    src={member.imageUrl}
                    alt={member.name}
                    fill
                    className="object-cover"
                    style={{ objectPosition: member.photoPosition || 'center' }}
                  />
                </div>
                <h3 className="font-display text-2xl text-brand-cream mb-1">
                  {member.name}
                </h3>
                <p className="text-brand-burgundy font-medium mb-4">
                  {member.role}
                </p>
                <p className="text-brand-tan text-sm max-w-sm mx-auto">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="font-mono text-brand-burgundy-light font-medium tracking-[0.15em] uppercase text-sm mb-4">
              {values.eyebrow}
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-brand-cream">
              {values.heading}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.cards.map((card) => (
              <div key={card.title} className="bg-brand-black p-8 card-hover">
                <div className="w-12 h-12 bg-brand-burgundy flex items-center justify-center mb-6">
                  <Icon icon={card.icon} className="w-6 h-6 text-brand-cream" />
                </div>
                <h3 className="font-display text-xl text-brand-cream mb-3">
                  {card.title}
                </h3>
                <p className="text-text-secondary text-sm">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-burgundy relative overflow-hidden">
        <div className={`absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-10`} style={{ backgroundImage: `url('${ctaBackground}')` }} />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl md:text-5xl text-brand-cream mb-6">
            {cta.heading}
          </h2>
          <p className="text-brand-cream/80 text-lg mb-10">
            {cta.description}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-brand-black text-brand-cream px-8 py-4 font-medium tracking-wide hover:bg-brand-black/80 transition-colors"
          >
            {cta.buttonText}
            <Icon icon="mdi:arrow-right" className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </>
  )
}
