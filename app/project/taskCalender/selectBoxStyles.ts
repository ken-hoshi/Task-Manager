export const selectBoxStyles = {
  container: (baseStyles: any) => ({
    ...baseStyles,
    width: "3.5vw",
    fontSize: "1vh",
    margin: "0 auto",
  }),
  control: (baseStyles: any, { selectProps }: any) => {
    let color = "#fff";

    if (selectProps?.statusId) {
      switch (selectProps.statusId) {
        case 1:
          color = "#ff9090";
          break;
        case 2:
          color = "#48d2e5";
          break;
        case 3:
          color = "#48e57d";
          break;
        default:
          color = "#fff";
      }
    }

    return {
      ...baseStyles,
      minHeight: "2.7vh",
      height: "2.7vh",
      borderRadius: "0.5vh",
      cursor: "pointer",
      backgroundColor: color,
      border: "none",
      boxShadow: "1px -1px 2px rgba(0, 0, 0, 0.2)",
    };
  },
  valueContainer: (baseStyles: any) => ({
    ...baseStyles,
    padding: 0,
    margin: 0,
  }),
  singleValue: (baseStyles: any) => ({
    ...baseStyles,
    color: "white",
  }),
  dropdownIndicator: (baseStyles: any) => ({
    ...baseStyles,
    display: "none",
  }),
  indicatorSeparator: (baseStyles: any) => ({
    ...baseStyles,
    display: "none",
  }),
  menu: (baseStyles: any) => ({
    ...baseStyles,
    position: "absolute",
    left: "105%",
    zIndex: 1000,
    top: "-4px",
    border: "none",
    boxShadow: "none",
    backgroundColor: "transparent",
    margin: "0 auto",
    width: "220%",
  }),
  menuList: (baseStyles: any) => ({
    ...baseStyles,
    display: "flex",
  }),
  option: (
    baseStyles: any,
    state: { data: { value: number }; isFocused: boolean }
  ) => {
    let color;
    let hoverColor;

    switch (state.data.value) {
      case 1:
        color = "#ff9090";
        hoverColor = "#fdb4b4";
        break;
      case 2:
        color = "#48d2e5";
        hoverColor = "#6ddeed";
        break;
      case 3:
        color = "#48e57d";
        hoverColor = "#71f09c";
        break;
      default:
        color = "#ccc";
        hoverColor = "#ddd";
        break;
    }

    return {
      ...baseStyles,
      backgroundColor: state.isFocused ? hoverColor : color,
      color: "white",
      height: "2.7vh",
      minHeight: "2.7vh",
      width: "9vh",
      margin: "0.1vh auto",
      padding: 0,
      fontSize: "1.3vh",
      borderRadius: "0.5vh",
      cursor: "pointer",
      display: "flex !important",
      alignItems: "center !important",
      justifyContent: "center !important",
    };
  },
};
