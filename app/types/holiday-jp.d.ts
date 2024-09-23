declare module "holiday-jp" {
  interface Holiday {
    date: string;
    name: string;
  }

  const holidayJp: {
    isHoliday: (date: Date) => boolean;
    between: (start: Date, end: Date) => Holiday[];
  };

  export default holidayJp;
}
