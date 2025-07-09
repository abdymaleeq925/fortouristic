import { ComboBoxComponent } from "@syncfusion/ej2-react-dropdowns";
import { Header } from "components";
import type { Route } from "./+types/create-trip";


export const loader = async () => {
  const response = await fetch(
    "https://restcountries.com/v3.1/all?fields=name,flags,latlng,maps,cca2"
  );
  const data = await response.json();
  function countryCodeToEmoji(countryCode: string) {
    return countryCode
      .toUpperCase()
      .replace(/./g, (char:string) => 
        String.fromCodePoint(127397 + char.charCodeAt(0)));
  }
  return data.map((country: any) => ({
    name: `${countryCodeToEmoji(country.cca2)} ${country.name?.common}`,
    coordinates: country.latlng,
    value: country.name?.common,
    openStreetMap: country.maps?.openStreetMaps,
  }));
};

const CreateTrip = ({ loaderData }: Route.ComponentProps) => {
  const handleSubmit = async () => {};
  const countries = loaderData as Country[];
  console.log('data',countries)
  const countryData = countries.map(country => ({
    text: country.name,
    value: country.value
  }))
  console.log("countries", countryData);

  return (
    <main className="flex flex-col gap-10 pb-20 wrapper">
      <Header
        title="Add a new Trip"
        description="View and edit AI-generated travel plans."
      />
      <section className="mt-25 wrapper-md">
        <form className="trip-form" onSubmit={handleSubmit}>
          <div className="">
            <label htmlFor="country">Country</label>
            <ComboBoxComponent
              id="country"
              dataSource={countryData}
              fields={{text: 'text', value: 'value'}}
              placeholder="Select a Country"
              className="combo-box"
              />
          </div>
        </form>
      </section>
    </main>
  );
};
export default CreateTrip;
