import Image from "next/image";

const backgroundContainer: React.CSSProperties = {
  position: "absolute",
  width: "100%",
  height: "60vh",
  bottom: 0,
};

const textArea: React.CSSProperties = {
  backgroundColor: " #ffffff",
  position: "absolute",
  top: "50vh",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "70vh",
  height: "70vh",
  borderRadius: "15px",
  boxShadow: "3px 3px 20px rgba(0, 0, 0, 10)",
  color: "#000000",
};

const h1: React.CSSProperties = {
  fontWeight: 500,
  fontSize: "8vh",
  textAlign: "center",
  marginBottom: 0,
};

const p: React.CSSProperties = {
  marginTop: 0,
  textAlign: "center",
};

const dogArea: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginTop: "9vh",
};

const dogImage: React.CSSProperties = {
  width: "35vh",
  height: "25vh",
  position: "relative",
};

const NotFound = () => {
  return (
    <>
      <div style={backgroundContainer}>
        <Image
          src="/img/background-image1.jpeg"
          alt="background-image1"
          style={{ objectFit: "cover", objectPosition: "top", opacity: 0.05 }}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={true}
        />
      </div>
      <div style={textArea}>
        <h1 style={h1}>404 Not Found</h1>
        <p style={p}>There is no page you are looking for!</p>
        <div style={dogArea}>
          <div style={dogImage}>
            <Image
              src="/img/dog.png"
              alt="dog"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={true}
            />
          </div>
          <p style={p}>Sorry...</p>
        </div>
      </div>
    </>
  );
};

export default NotFound;
