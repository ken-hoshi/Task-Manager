export const selectBoxStyles = {
  container: (baseStyles: any) => ({
    ...baseStyles,
    width: "8.5vh",
    fontSize: "1.3vh",
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
      minHeight: "3.5vh",
      height: "3.5vh",
      borderRadius: "1vh",
      cursor: "pointer",
      backgroundColor: color,
      border: "none",
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
      height: "3.5vh",
      minHeight: "3.5vh",
      width: "9vh",
      margin: "0.1vh auto",
      padding: 0,
      fontSize: "1.3vh",
      borderRadius: "1vh",
      cursor: "pointer",
      display: "flex !important",
      alignItems: "center !important",
      justifyContent: "center !important",
    };
  },
};
