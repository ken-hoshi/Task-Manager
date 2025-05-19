import { render } from '@testing-library/react';
import { Greeting } from './Greeting';

test('Greeting スナップショット', () => {
  const { asFragment } = render(<Greeting name="Taro" />);
  expect(asFragment()).toMatchSnapshot();
});
