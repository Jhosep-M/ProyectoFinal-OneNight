import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = true, ...props }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      className={`card ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
