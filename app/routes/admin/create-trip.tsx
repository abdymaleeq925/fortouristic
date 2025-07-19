import {
  ComboBoxComponent,
  MultiSelectComponent,
  type MultiSelectChangeEventArgs,
} from "@syncfusion/ej2-react-dropdowns";
import { Header } from "components";
import type { Route } from "./+types/create-trip";
import { comboBoxItems, selectItems } from "~/constants";
import { cn, formatKey } from "lib/utils";
import {
  LayerDirective,
  LayersDirective,
  MapsComponent,
} from "@syncfusion/ej2-react-maps";
import { useEffect, useState } from "react";
import { world_map } from "~/constants/world_map";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { account } from "~/appwrite/client";
import { useNavigate } from "react-router";

export const loader = async () => {
  const response = await fetch(
    "https://restcountries.com/v3.1/all?fields=name,flags,latlng,maps,cca2"
  );
  const data = await response.json();
  function countryCodeToEmoji(countryCode: string) {
    return countryCode
      .toUpperCase()
      .replace(/./g, (char: string) =>
        String.fromCodePoint(127397 + char.charCodeAt(0))
      );
  }
  return data.map((country: any) => ({
    name: `${countryCodeToEmoji(country.cca2)} ${country.name?.common}`,
    coordinates: country.latlng,
    value: country.name?.common,
    openStreetMap: country.maps?.openStreetMaps,
  }));
};

type CitySelection = {
  name: string;
  selected: boolean;
};

const CreateTrip = ({ loaderData }: Route.ComponentProps) => {
  const countries = loaderData as Country[];
  const navigate = useNavigate();
  const [formData, setFormData] = useState<TripFormData>({
    country: "",
    travelStyle: "",
    interest: "",
    budget: "",
    duration: 0,
    groupType: "",
    cities: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<CitySelection[]>([]);
  const [fetchingCitiesLoading, setFetchingCitiesLoading] = useState(false);

  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.country) return;
      setFetchingCitiesLoading(true);
      try {
        const countryName = formData.country.replace(/^[^\s]+\s/, "");
        const response = await fetch(
          "https://countriesnow.space/api/v0.1/countries/cities",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ country: countryName }),
          }
        );

        const data = await response.json();
        if (data.error) throw new Error(data.msg);

        setCities(
          data.data.map((city: string) => ({
            name: city,
            selected: false,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch cities:", error);
        setCities([]);
      } finally {
        setFetchingCitiesLoading(false);
      }
    };

    fetchCities();
  }, [formData.country]);

  const handleCitiesChange = (args: MultiSelectChangeEventArgs) => {
    const selectedCities = args.value as string[];
    setCities((prevCities) =>
      prevCities.map((city) => ({
        ...city,
        selected: selectedCities.includes(city.name),
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const selectedCities = cities.filter((c) => c.selected).map((c) => c.name);
    if (selectedCities.length > 5) {
      setError("Please select up to 5 cities");
      setLoading(false);
      return;
    }
    if (
      !formData.country ||
      !formData.travelStyle ||
      !formData.interest ||
      !formData.budget ||
      !formData.groupType
    ) {
      setError("Please provide values for all fields");
      setLoading(false);
      return;
    }
    if (formData.duration < 1 || formData.duration > 10) {
      setError("Duration must be between 1 and 10 days");
      setLoading(false);
      return;
    }
    const user = await account.get();
    if (!user.$id) {
      console.error("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/create-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: formData.country,
          cities: selectedCities,
          numberOfDays: formData.duration,
          travelStyle: formData.travelStyle,
          interests: formData.interest,
          budget: formData.budget,
          groupType: formData.groupType,
          userId: user.$id,
        }),
      });
      const result: CreateTripResponse = await response.json();
      if (result?.id) navigate(`/trips/${result.id}`);
      else console.error("Failed to generate trip");
    } catch (e) {
      console.error("Error generating trip", e);
    } finally {
      setLoading(false);
    }
  };
  const handleChange = (key: keyof TripFormData, value: string | number) => {
    setFormData({ ...formData, [key]: value });
  };
  const countryData = countries.map((country) => ({
    text: country.name,
    value: country.value,
  }));

  const mapData = [
    {
      country: formData.country,
      color: "EA382E",
      coordinates:
        countries.find((c: Country) => c.name === formData.country)
          ?.coordinates || [],
    },
  ];
  const cityOptions = cities.map((city) => ({
    text: city.name,
    value: city.name,
  }));

  const selectedCityValues = cities
    .filter((city) => city.selected)
    .map((city) => city.name);

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
              fields={{ text: "text", value: "value" }}
              placeholder="Select a Country"
              className="combo-box"
              change={(e: { value: string | undefined }) => {
                if (e.value) {
                  handleChange("country", e.value);
                }
              }}
              allowFiltering
              filtering={(e) => {
                const query = e.text.toLowerCase();
                e.updateData(
                  countries
                    .filter((country) =>
                      country.name.toLowerCase().includes(query)
                    )
                    .map((country) => ({
                      text: country.name,
                      value: country.value,
                    }))
                );
              }}
            />
          </div>
          {formData.country && (
            <div>
              <label htmlFor="cities">
                Cities in {formData.country.replace(/^[^\s]+\s/, "")}
              </label>
              {fetchingCitiesLoading ? (
                <div className="flex items-center text-sm text-gray-500">
                  <img
                    src="/assets/icons/loader.svg"
                    alt="Loading"
                    className="size-4 animate-spin mr-2"
                  />
                  Loading cities...
                </div>
              ) : cities.length > 0 ? (
                <MultiSelectComponent
                  placeholder="Select cities"
                  cssClass="combo-box"
                  dataSource={cityOptions}
                  fields={{ text: "text", value: "value" }}
                  change={handleCitiesChange}
                  value={selectedCityValues}
                />
              ) : (
                <p className="text-base text-gray-100">No citites found</p>
              )}
            </div>
          )}
          <div>
            <label htmlFor="duration">Duration</label>
            <input
              type="number"
              id="duration"
              name="duration"
              placeholder="Enter a number of days(up to 10)"
              className="form-input placeholder:text-gray-100"
              onChange={(e) => handleChange("duration", Number(e.target.value))}
            ></input>
          </div>
          {selectItems.map((key) => (
            <div className="" key={key}>
              <label htmlFor="key">{formatKey(key)}</label>
              <ComboBoxComponent
                id={key}
                dataSource={comboBoxItems[key].map((item) => ({
                  text: item,
                  value: item,
                }))}
                fields={{ text: "text", value: "value" }}
                placeholder={`Select ${formatKey(key)}`}
                change={(e: { value: string | undefined }) => {
                  if (e.value) {
                    handleChange(key, e.value);
                  }
                }}
                allowFiltering
                filtering={(e) => {
                  const query = e.text.toLowerCase();
                  e.updateData(
                    comboBoxItems[key]
                      .filter((item) => item.toLowerCase().includes(query))
                      .map((item) => ({
                        text: item,
                        value: item,
                      }))
                  );
                }}
                className="combo-box"
              />
            </div>
          ))}
          <div className="">
            <label htmlFor="location">
              Location on the world map
              <MapsComponent>
                <LayersDirective>
                  <LayerDirective
                    dataSource={mapData}
                    shapeData={world_map}
                    shapePropertyPath="name"
                    shapeDataPath="country"
                    shapeSettings={{ colorValuePath: "color", fill: "#e5e5e5" }}
                  />
                </LayersDirective>
              </MapsComponent>
            </label>
          </div>
          <div className="bg-grap-200 h-px w-full" />
          {error && (
            <div className="error">
              <p>{error}</p>
            </div>
          )}
          <footer className="px-6 w-full">
            <ButtonComponent
              type="submit"
              className="button-class !h-12 !w-full"
              disabled={loading}
            >
              <img
                src={`/assets/icons/${
                  loading ? "loader.svg" : "magic-star.svg"
                }`}
                alt="loading"
                className={cn("size-5", { "animate-spin": loading })}
              />
              <span className="p-16-semibold text-white">
                {loading ? "Generating..." : "Generate Trip "}
              </span>
            </ButtonComponent>
          </footer>
        </form>
      </section>
    </main>
  );
};
export default CreateTrip;
