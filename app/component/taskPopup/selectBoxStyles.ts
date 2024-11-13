export const selectBoxStyles = {
  control: (baseStyles: any) => ({
    ...baseStyles,
    width: "35vh",
    minHeight: "6.5vh",
    height: "6.5vh",
    margin: "0 auto",
    backgroundColor: "#d9d9d9",
    border: "none",
    borderBottom: "1px solid #000000",
    borderRadius: 0,
    overflow: "hidden",
  }),
  input: (baseStyles: any) => ({
    ...baseStyles,
    margin: 0,
    padding: 0,
  }),
  placeholder: (baseStyles: any) => ({
    ...baseStyles,
    fontSize: "2vh",
  }),
  singleValue: (baseStyles: any) => ({
    ...baseStyles,
    fontSize: "2vh",
    margin: "0 auto",
  }),
  indicatorSeparator: (baseStyles: any) => ({
    ...baseStyles,
    backgroundColor: "black",
  }),
  dropdownIndicator: (baseStyles: any) => ({
    ...baseStyles,
    color: "black",
    cursor: "pointer",
    width: "4vh",
    padding: 0,
    display: "flex",
    justifyContent: "center",
  }),
  menu: (baseStyles: any) => ({
    ...baseStyles,
    zIndex: 10,
    width: "80%",
    margin: "0.1vh auto 0",
    left: 0,
    right: 0,
    border: "0.1vh solid black",
    borderRadius: "0",
  }),
  option: (baseStyles: any, state: { isSelected: any; isFocused: any }) => ({
    ...baseStyles,
    backgroundColor: state.isSelected
      ? "#007bff"
      : state.isFocused
      ? "#007bff"
      : undefined,
    color: state.isSelected || state.isFocused ? "white" : undefined,
    minHeight: "6.5vh",
    height: "6.5vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto",
  }),
};
