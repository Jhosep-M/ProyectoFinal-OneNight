import { motion } from 'framer-motion';

export default function Card({
  children,
  title,
  actions,
  padded = false,
  className = '',
  hover = false,
  ...props
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      className={`card ${className}`.trim()}
      {...props}
    >
      {(title || actions) && (
        <div className="card-header">
          {title && <h3>{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {padded ? <div className="card-body">{children}</div> : children}
    </motion.div>
  );
}
