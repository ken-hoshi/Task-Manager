export const selectBoxStyles = {
  control: (baseStyles: any) => ({
    ...baseStyles,
    width: "100%",
    margin: "0 auto",
    backgroundColor: "#d9d9d9",
    border: "none",
    borderBottom: "1px solid #000000",
    borderRadius: 0,
    height: "5vh",
    minHeight: "5vh",
    overflow: "hidden",
    alignItems: "start",
  }),
  multiValue: (baseStyles: any) => ({
    ...baseStyles,
    margin: "0 0 0 1vh",
  }),
  valueContainer: (baseStyles: any) => ({
    ...baseStyles,
    height: "4vh",
    maxHeight: "4vh",
    overflowY: "auto",
  }),
  input: (baseStyles: any) => ({
    ...baseStyles,
    margin: 0,
    padding: 0,
  }),
  clearIndicator: (baseStyles: any) => ({
    ...baseStyles,
    padding: "0",
  }),
  indicatorSeparator: (baseStyles: any) => ({
    ...baseStyles,
    backgroundColor: "black",
    margin: "1vh 0",
  }),
  dropdownIndicator: (baseStyles: any) => ({
    ...baseStyles,
    color: "black",
    cursor: "pointer",
    width: "7vh",
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
    border: "1px solid black",
    borderRadius: "0",
    maxHeight: "40vh",
    overflowY: "visible", 
  }),
  menuList: (baseStyles: any) => ({
    ...baseStyles,
    padding: 0,
    maxHeight: "40vh",
    overflowY: "auto",
  }),
  option: (baseStyles: any, state: { isSelected: any; isFocused: any }) => ({
    ...baseStyles,
    backgroundColor: state.isSelected
      ? "#007bff"
      : state.isFocused
      ? "#007bff"
      : undefined,
    color: state.isSelected || state.isFocused ? "white" : undefined,
  }),
};
