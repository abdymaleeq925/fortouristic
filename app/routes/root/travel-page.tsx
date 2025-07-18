import { parseTripData } from "lib/utils";
import { Link, useSearchParams, type LoaderFunctionArgs } from "react-router";
import { getUser } from "~/appwrite/auth";
import { getAllTrips } from "~/appwrite/trips";
import type { Route } from "./+types/travel-page";
import { useState } from "react";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { Header, TripCard } from "components";
import { PagerComponent } from "@syncfusion/ej2-react-grids";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const limit = 9;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const offset = (page - 1) * limit;

  const [user, { allTrips, total }] = await Promise.all([
    getUser(),
    getAllTrips(limit, offset),
  ]);

  return {
    trips: allTrips.map(({ $id, tripDetail, imageUrls }) => ({
      id: $id,
      ...parseTripData(tripDetail),
      imageUrls: imageUrls ?? [],
    })),
    total,
  };
};

const TravelPage = ({ loaderData }: Route.ComponentProps) => {
  const trips = loaderData.trips as Trip[] | [];
  const [searchParams] = useSearchParams();
  const inititalPage = Number(searchParams.get("page") || 1);
  const [currentPage, setCurrentPage] = useState(inititalPage);
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.location.search = `?page=${page}`;
  };
  return (
    <main className="flex flex-col">
      <section className="travel-hero">
        <div>
          <section className="wrapper">
            <article>
              <h1 className="p-72-bold text-dark-100">
                Plan Your Trip with Ease
              </h1>
              <p className="text-dark-100">
                Customize your travel itinerary in minutes—pick your
                destination, set your preferences, and explore with confidence.
              </p>
            </article>
            <Link to="#trips">
              <ButtonComponent
                type="button"
                className="button-class !h-11 !w-full md:!w-[240px]"
              >
                <span className="p-16-sembiold text-white">Get Started</span>
              </ButtonComponent>
            </Link>
          </section>
        </div>
      </section>

      {/* <section className="pt-20 wrapper flex flex-col gap-10 h-full">
            <Header title="Featured Travel Destinations" description="Check out some of the best places you visit around the world"/>
            <div className="featured">
                <article>

                </article>
            </div>
        </section> */}
      <section id="trips" className="py-20 wrapper flex flex-col gap-10">
        <Header
          title="Handpicked Trips"
          description="Browse well-planned trips designes for your travel style"
        />
        <div className="trip-grid">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              id={trip.id}
              name={trip.name}
              imageUrl={trip.imageUrls[0]}
              location={trip.itinerary?.[0]?.location ?? ""}
              tags={[trip.interests, trip.travelStyle]}
              price={trip.estimatedPrice}
            />
          ))}
        </div>
        <PagerComponent
          totalRecordsCount={loaderData.total}
          pageSize={9}
          currentPage={currentPage}
          click={(args) => handlePageChange(args.currentPage)}
          cssClass="!mb-4"
        />
      </section>

      <footer className="h-28 bg-white">
        <div className="wrapper footer-container">
          <Link to="/">
            <img
              src="/assets/icons/logo.svg"
              alt="logo"
              className="size-[30px]"
            />
            <h1>ForTouristic</h1>
          </Link>
          <div>
            {["Terms & Conditions", "Privacy Policy"].map((item) => (
              <Link to="/" key={item}>
                {item}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
};

export default TravelPage;
