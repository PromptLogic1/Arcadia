const NeonBorder = ({ children, className = "", color = "cyan" }) => (
  <div className={`relative ${className}`}>
    <div className={`absolute inset-0 bg-gradient-to-r from-${color}-500 via-pink-500 to-yellow-500 rounded-lg opacity-75 blur-sm`}></div>
    <div className="relative bg-gray-800 rounded-lg p-0.5">
      {children}
    </div>
  </div>
)

export default NeonBorder