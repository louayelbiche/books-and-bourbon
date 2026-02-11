import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@iconify/react'

const stats = [
  { value: '50+', label: 'Episodes Recorded' },
  { value: '40+', label: 'Authors Featured' },
  { value: '100K+', label: 'Community Members' },
  { value: '25+', label: 'Partner Publishers' },
]

const team = [
  {
    name: 'Jessica Schaefer',
    role: 'Host',
    photo: '/images/team/jessica-schaefer.webp',
    photoPosition: 'center 25%',
    bio: 'Jessica brings her passion for literature and meaningful conversations to every episode of Books and Bourbon.',
  },
  {
    name: 'Andy Duenas',
    role: 'Host',
    photo: '/images/team/andy-duenas.jpg',
    photoPosition: 'center 15%',
    bio: 'Andy combines his love of storytelling with deep industry expertise to create engaging discussions.',
  },
  {
    name: 'Patrick Kearns',
    role: 'Host',
    photo: '/images/team/patrick-kearns.jpg',
    photoPosition: 'center 20%',
    bio: 'Patrick contributes his unique perspective and thoughtful analysis to every literary conversation.',
  },
]

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="pt-32 pb-24 bg-brand-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-brand-burgundy/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
            Our Story
          </p>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-brand-cream mb-6 max-w-4xl">
            Where Literature Meets <span className="text-gradient">Conversation</span>
          </h1>
          <p className="text-text-secondary text-xl max-w-2xl">
            Books and Bourbon began with a simple idea: bring readers closer to the authors they love through intimate, thoughtful conversations.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-display text-4xl text-brand-cream mb-6">
                Our Mission
              </h2>
              <p className="text-text-secondary leading-relaxed mb-6">
                In an age of endless content, we believe in the power of deep, meaningful conversations about literature. Our mission is to create a space where authors can share not just their work, but their creative process, inspirations, and the stories behind the stories.
              </p>
              <p className="text-text-secondary leading-relaxed mb-6">
                Every episode is a carefully curated experience, designed to give our audience insights they cannot find anywhere else. We pair each discussion with a carefully selected bourbon, creating an atmosphere of warmth and sophistication.
              </p>
              <p className="text-text-secondary leading-relaxed">
                Whether you&apos;re a dedicated bibliophile or simply curious about the world of books, Books and Bourbon offers a unique window into the minds of today&apos;s most compelling writers.
              </p>
            </div>

            <div className="relative">
              <div className="aspect-square relative burgundy-glow">
                <Image
                  src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800"
                  alt="Books and conversation"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-brand-burgundy flex items-center justify-center">
                <div className="text-center">
                  <p className="font-display text-4xl text-brand-cream">5+</p>
                  <p className="text-brand-cream/80 text-sm">Years of Stories</p>
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
            <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
              The Hosts
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-brand-cream">
              Meet the Team
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {team.map((member) => (
              <div key={member.name} className="text-center">
                <div className="w-48 h-48 mx-auto relative mb-6 burgundy-glow rounded-full overflow-hidden">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="object-cover"
                    style={{ objectPosition: member.photoPosition }}
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
            <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
              What Drives Us
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-brand-cream">
              Our Values
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-brand-black p-8 card-hover">
              <div className="w-12 h-12 bg-brand-burgundy flex items-center justify-center mb-6">
                <Icon icon="mdi:book-open-variant" className="w-6 h-6 text-brand-cream" />
              </div>
              <h3 className="font-display text-xl text-brand-cream mb-3">
                Literary Excellence
              </h3>
              <p className="text-text-secondary text-sm">
                We curate only the finest works and most compelling authors, ensuring every episode offers genuine literary value.
              </p>
            </div>

            <div className="bg-brand-black p-8 card-hover">
              <div className="w-12 h-12 bg-brand-burgundy flex items-center justify-center mb-6">
                <Icon icon="mdi:account-group" className="w-6 h-6 text-brand-cream" />
              </div>
              <h3 className="font-display text-xl text-brand-cream mb-3">
                Community First
              </h3>
              <p className="text-text-secondary text-sm">
                Our audience is at the heart of everything we do. We actively seek and incorporate community feedback and suggestions.
              </p>
            </div>

            <div className="bg-brand-black p-8 card-hover">
              <div className="w-12 h-12 bg-brand-burgundy flex items-center justify-center mb-6">
                <Icon icon="mdi:microphone" className="w-6 h-6 text-brand-cream" />
              </div>
              <h3 className="font-display text-xl text-brand-cream mb-3">
                Authentic Voices
              </h3>
              <p className="text-text-secondary text-sm">
                We create an environment where authors feel comfortable sharing their true selves, beyond the polished public persona.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-burgundy relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1920')] bg-cover bg-center mix-blend-overlay opacity-10" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl md:text-5xl text-brand-cream mb-6">
            Join the Conversation
          </h2>
          <p className="text-brand-cream/80 text-lg mb-10">
            Have a book you&apos;d love us to feature? An author you think our audience would enjoy? We want to hear from you.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-brand-black text-brand-cream px-8 py-4 font-medium tracking-wide hover:bg-brand-black/80 transition-colors"
          >
            Get in Touch
            <Icon icon="mdi:arrow-right" className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </>
  )
}
