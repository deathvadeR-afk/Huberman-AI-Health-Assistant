import { motion } from 'framer-motion'
import { Brain, Github, ExternalLink, Heart } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <footer className="relative mt-20">
      {/* Gradient Border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="col-span-1 md:col-span-2"
          >
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg blur opacity-75" />
                <div className="relative bg-gradient-to-r from-primary-600 to-accent-500 p-2 rounded-lg">
                  <Brain className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Huberman Health AI
                </h3>
                <p className="text-sm text-white/60">
                  Science-Based Health Assistant
                </p>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed max-w-md">
              Discover evidence-based health insights from Dr. Andrew Huberman's extensive research and podcast library. 
              Get personalized recommendations powered by AI to optimize your health and performance.
            </p>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { name: 'Search Videos', href: '/search' },
                { name: 'Health Topics', href: '/topics' },
                { name: 'Popular Content', href: '/search?sort=popular' },
                { name: 'Latest Episodes', href: '/search?sort=recent' },
              ].map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-white/60 hover:text-white transition-colors duration-200 text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Resources */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              {[
                { 
                  name: 'Huberman Lab Podcast', 
                  href: 'https://www.youtube.com/@hubermanlab',
                  external: true 
                },
                { 
                  name: 'Stanford Profile', 
                  href: 'https://profiles.stanford.edu/andrew-huberman',
                  external: true 
                },
                { 
                  name: 'Research Papers', 
                  href: 'https://scholar.google.com/citations?user=0bDGgYgAAAAJ',
                  external: true 
                },
                { 
                  name: 'Project GitHub', 
                  href: 'https://github.com/your-username/huberman-health-ai',
                  external: true 
                },
              ].map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-white/60 hover:text-white transition-colors duration-200 text-sm flex items-center space-x-1"
                  >
                    <span>{link.name}</span>
                    {link.external && <ExternalLink className="h-3 w-3" />}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 pt-8 border-t border-white/10"
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 text-sm text-white/60">
              <span>© 2024 Huberman Health AI</span>
              <span>•</span>
              <span>Built with</span>
              <Heart className="h-4 w-4 text-red-400" />
              <span>for science-based health</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/your-username/huberman-health-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors duration-200"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10"
        >
          <p className="text-xs text-white/50 leading-relaxed">
            <strong>Disclaimer:</strong> This AI assistant provides information based on Dr. Andrew Huberman's publicly available content. 
            It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare 
            providers regarding your health decisions. The creators of this tool are not affiliated with Dr. Huberman or Stanford University.
          </p>
        </motion.div>
      </div>
    </footer>
  )
}

export default Footer
