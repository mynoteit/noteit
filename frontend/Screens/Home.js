import React, { useEffect, useState } from "react";
import Container from "@components/Container";
import Screen from "@components/Screen";
import AvailableSubjects from "@components/UserDashboard/AvailableSubjects";
import { useNote } from "@contexts/NoteProvider";
import Loader from "@components/Loader";

export default function Home() {
  const [availableNotes, setAvailableNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const noteContext = useNote();

  useEffect(() => {
    if (!noteContext.isLoading) {
      setAvailableNotes(noteContext);
      setIsLoading(false);
    }
  }, [noteContext]);

  return (
    <Screen>
      <Container className="home">
        {isLoading ? <Loader /> : <AvailableSubjects notes={availableNotes} />}
      </Container>
    </Screen>
  );
}
