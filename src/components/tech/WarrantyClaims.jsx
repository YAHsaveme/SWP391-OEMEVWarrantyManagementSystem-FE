import React, { useEffect, useState } from "react";
import {
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import axiosInstance from "../../services/axiosInstance";

export default function WarrantyClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setClaims([
        { id: "WC-9001", device: "Dell XPS 15", status: "approved" },
        { id: "WC-9002", device: "iPhone 13", status: "pending" },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <>
      <Typography variant="h5" gutterBottom>
        Warranty Claims
      </Typography>
      <Grid container spacing={2}>
        {claims.map((c) => (
          <Grid item xs={12} md={6} key={c.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{c.device}</Typography>
                <Chip
                  label={c.status}
                  color={c.status === "approved" ? "success" : "warning"}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Claim ID: {c.id}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1 }}
                  onClick={() => alert(`Open claim ${c.id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
