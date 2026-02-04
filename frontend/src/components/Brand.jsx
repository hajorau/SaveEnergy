export default function Brand({
  size = 36,
  showTeam = false,
  centered = false,
}) {
  return (
    <div
      style={{
        textAlign: centered ? "center" : "left",
        marginBottom: 12,
      }}
    >
      <span
        style={{
          display: "inline-block",
          padding: "6px 18px",
          border: "2px solid #ccc",
          borderRadius: 12,
          background: "#fafafa",
          fontWeight: 900,
          letterSpacing: "0.6px",
          fontSize: size,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        SaveEnergyTool
        <sup
          style={{
            fontSize: "0.5em",
            marginLeft: 2,
            verticalAlign: "super",
          }}
        >
          ™
        </sup>
      </span>

      {showTeam && (
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            opacity: 0.7,
            fontWeight: 500,
          }}
        >
          by SaveEnergyTeam
        </div>
      )}
    </div>
  );
}
